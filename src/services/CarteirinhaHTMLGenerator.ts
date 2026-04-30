import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro'; // ✅ html2canvas-pro suporta OKLAB do Tailwind v4
import { UserProfile, Dependente } from '../types';

export class CarteirinhaHTMLGenerator {
  static async generateCarteirinha(profile: UserProfile, dependents: Dependente[]): Promise<void> {
    try {
      console.log('🎨 Gerando carteirinha com HTML/CSS...');

      // Criar container com tamanho EXATO das carteirinhas (sem espaço extra)
      // Conversão exata: 1mm = 96/25.4 px = 3.7795... px
      // 101.6mm × 3.7795 = 384px exatos
      // 63.5mm × 3.7795 = 240px exatos
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '0';
      container.style.top = '0';
      container.style.width = '384px';   // EXATAMENTE 101.6mm
      container.style.height = '480px';  // EXATAMENTE 63.5mm × 2 (frente + verso)
      container.style.overflow = 'hidden';
      container.style.visibility = 'visible';
      container.style.backgroundColor = 'transparent';
      container.style.padding = '0';
      container.style.margin = '0';

      // Frente - dimensionado EXATAMENTE para 101.6 x 63.5 mm (sem espaços)
      const frontDiv = document.createElement('div');
      frontDiv.style.width = '101.6mm';
      frontDiv.style.height = '63.5mm';
      frontDiv.style.margin = '0';
      frontDiv.style.padding = '0';
      frontDiv.style.border = 'none';
      frontDiv.style.boxSizing = 'border-box';
      frontDiv.innerHTML = this.generateFrontHTML(profile);
      container.appendChild(frontDiv);

      // Verso - dimensionado EXATAMENTE para 101.6 x 63.5 mm (sem espaços)
      const backDiv = document.createElement('div');
      backDiv.style.width = '101.6mm';
      backDiv.style.height = '63.5mm';
      backDiv.style.margin = '0';
      backDiv.style.padding = '0';
      backDiv.style.border = 'none';
      backDiv.style.boxSizing = 'border-box';
      backDiv.innerHTML = this.generateBackHTML(dependents);
      container.appendChild(backDiv);

      // Adicionar ao body de forma visível
      document.body.appendChild(container);

      // Esperar renderização completa com múltiplas técnicas
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force reflow para garantir que o navegador renderize
      container.offsetHeight; // Trigger reflow

      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('📸 Renderizando frente...');
      // Renderizar frente
      const canvasFront = await html2canvas(frontDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#003A6F',
        logging: false,
        allowTaint: true,
        removeContainer: false
      });

      console.log('📸 Renderizando verso...');
      // Renderizar verso
      const canvasBack = await html2canvas(backDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        removeContainer: false
      });

      console.log('📄 Criando PDF em A4 (vertical)...');
      // Criar PDF em tamanho A4 vertical (portrait)
      const pdf = new jsPDF({
        orientation: 'portrait',  // ✅ Vertical
        unit: 'mm',
        format: 'a4',  // ✅ A4 (210 x 297 mm)
        compress: true,
        precision: 16
      });

      // Dimensões A4 e posicionamento
      const pageWidth = 210;  // mm
      const pageHeight = 297; // mm
      const carteirinhaWidth = 101.6;  // mm
      const carteirinhaHeight = 63.5;  // mm

      // Centralizar carteirinha horizontalmente
      const xPosition = (pageWidth - carteirinhaWidth) / 2;  // Centraliza (54.2mm de cada lado)
      const yPosition = 15;  // 15mm do topo

      // Adicionar frente (página 1)
      const imgFront = canvasFront.toDataURL('image/png');
      pdf.addImage(imgFront, 'PNG', xPosition, yPosition, carteirinhaWidth, carteirinhaHeight);

      // Adicionar verso (página 2)
      pdf.addPage('a4', 'portrait');
      const imgBack = canvasBack.toDataURL('image/png');
      pdf.addImage(imgBack, 'PNG', xPosition, yPosition, carteirinhaWidth, carteirinhaHeight);

      // Metadados
      pdf.setProperties({
        title: `Carteirinha SITITREL - ${profile.name}`,
        subject: 'Carteirinha Digital - SITITREL',
        author: 'SITITREL - Gestão Digital',
        keywords: 'carteirinha, sititrel, digital',
        creator: 'SITITREL HTML Generator v2.0'
      });

      console.log('💾 Salvando PDF...');
      pdf.save(`carteirinha-${profile.name}.pdf`);
      console.log('✅ PDF gerado com sucesso!');

      // Limpar
      document.body.removeChild(container);

    } catch (error) {
      console.error('❌ Erro:', error);
      throw new Error(`Erro ao gerar carteirinha: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static generateFrontHTML(profile: UserProfile): string {
    return `
    <div style="
      width: 101.6mm;
      height: 63.5mm;
      background: #003A6F;
      color: white;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      padding: 0;
      margin: 0;
      box-sizing: border-box;
    ">

      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.2);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="background: white; width: 35px; height: 35px; border-radius: 3px; display: flex; align-items: center; justify-content: center; color: #003A6F; font-weight: bold; font-size: 20px;">S</div>
          <div style="font-weight: bold; font-size: 14px;">SITITREL DIGITAL</div>
        </div>
        <div style="width: 35px; height: 35px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 8px;">QR</div>
      </div>

      <!-- Content -->
      <div style="flex: 1; display: flex; align-items: center; padding: 10px 12px; gap: 12px;">
        <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.15); border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; flex-shrink: 0;">${profile.name.charAt(0).toUpperCase()}</div>
        <div style="flex: 1;">
          <div style="font-size: 15px; font-weight: bold; line-height: 1.1; text-transform: uppercase; margin-bottom: 3px;">${profile.name}</div>
          <div style="color: #00BCD4; font-size: 11px; font-weight: bold; margin-bottom: 4px;">MATRÍCULA: ${profile.matricula || '---'}</div>
          <div style="font-size: 9px; opacity: 0.8; margin-bottom: 2px;">CPF</div>
          <div style="font-size: 12px; font-weight: bold;">${profile.cpf}</div>
        </div>
      </div>

      <!-- Footer -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-top: 1px solid rgba(255,255,255,0.2);">
        <div style="background: #00BCD4; color: #003A6F; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 9px; white-space: nowrap;">${profile.isSocio ? 'SÓCIO ATIVO' : 'VALIDAÇÃO'}</div>
        <div style="text-align: right; font-size: 9px;">
          <div style="opacity: 0.7;">VALIDADE</div>
          <div style="font-weight: bold; font-size: 11px;">INDETERMINADA</div>
        </div>
      </div>
    </div>
    `;
  }

  private static generateBackHTML(dependents: Dependente[]): string {
    const dependentCards = dependents.slice(0, 4).map(dep => `
      <div style="
        background: rgba(0, 58, 111, 0.05);
        border: 1px solid rgba(0, 58, 111, 0.1);
        border-radius: 6px;
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        margin-bottom: 8px;
      ">
        <div style="
          font-weight: bold;
          color: #003A6F;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${dep.name.toUpperCase()}</div>
        <div style="
          color: rgba(0, 58, 111, 0.6);
          font-size: 10px;
          flex-shrink: 0;
          margin-left: 8px;
        ">${dep.parentesco}</div>
      </div>
    `).join('');

    return `
    <div style="
      width: 101.6mm;
      height: 63.5mm;
      background: white;
      color: #003A6F;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      padding: 0;
      margin: 0;
      position: relative;
    ">
      <!-- Header Blue -->
      <div style="
        background: #003A6F;
        height: 28px;
        display: flex;
        align-items: center;
        padding: 0 15px;
      ">
        <div style="
          background: #003A6F;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          margin-right: 8px;
          font-size: 14px;
        ">P</div>
        <div style="
          color: white;
          font-weight: bold;
          font-size: 13px;
          letter-spacing: 0.5px;
        ">DEPENDENTES REGISTRADOS</div>
      </div>

      <!-- Divider -->
      <div style="
        height: 1px;
        background: rgba(0, 58, 111, 0.2);
        margin: 8px 15px 8px 15px;
      "></div>

      <!-- Dependents Content -->
      <div style="
        flex: 1;
        overflow: hidden;
        padding: 8px 15px;
        font-size: 12px;
      ">
        ${dependents.length > 0 ? dependentCards : `
          <div style="
            text-align: center;
            color: rgba(0, 58, 111, 0.5);
            font-size: 11px;
            padding: 20px;
          ">Nenhum dependente cadastrado</div>
        `}
      </div>

      <!-- Footer Blue -->
      <div style="
        background: #003A6F;
        height: 28px;
        display: flex;
        align-items: center;
        padding: 0 15px;
        color: white;
        font-size: 9px;
        gap: 8px;
      ">
        <div style="opacity: 0.7;">ASSINADO DIGITALMENTE POR</div>
        <div style="font-weight: bold; font-size: 10px;">SITITREL - GESTÃO DIGITAL</div>
      </div>
    </div>
    `;
  }
}
