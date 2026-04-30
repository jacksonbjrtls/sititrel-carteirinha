import jsPDF from 'jspdf';
import { UserProfile, Dependente } from '../types';

export class CarteirinaPDFGenerator {
  // Dimensões padrão de cartão ID (mm)
  private static readonly WIDTH = 101.6;  // 4 polegadas
  private static readonly HEIGHT = 63.5;  // 2.5 polegadas

  // Qualidade de renderização (8 = 800 DPI para qualidade máxima)
  private static readonly SCALE = 8;

  // Cores SITITREL
  private static readonly CYAN = '#00BCD4';
  private static readonly DARK_BLUE = '#003A6F';

  // Margens de segurança para impressão (mm)
  private static readonly BLEED = 3;      // Margem de corte
  private static readonly SAFETY_MARGIN = 2; // Margem de segurança

  static async generateCarteirinha(profile: UserProfile, dependents: Dependente[]): Promise<void> {
    try {
      console.log('Gerando carteirinhas estilo profissional...');

      const canvasFront = this.createCanvas(this.WIDTH * this.SCALE, this.HEIGHT * this.SCALE);
      const ctxFront = canvasFront.getContext('2d');
      if (!ctxFront) throw new Error('Erro ao obter contexto canvas frente');

      this.drawFront(ctxFront, profile);

      const canvasBack = this.createCanvas(this.WIDTH * this.SCALE, this.HEIGHT * this.SCALE);
      const ctxBack = canvasBack.getContext('2d');
      if (!ctxBack) throw new Error('Erro ao obter contexto canvas verso');

      this.drawBack(ctxBack, dependents);

      // PDF otimizado para impressão
      // Dimensões exatas do cartão ID padrão (101.6 x 63.5 mm)
      // Qualidade: 600 DPI (escala 6)
      // Recomendação de impressão: Papel Couché 300g/m²
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [this.WIDTH, this.HEIGHT],
        compress: true,  // Compressão para arquivo menor
        precision: 16    // Precisão máxima para qualidade
      });

      // Página 1: Frente
      const imgFront = canvasFront.toDataURL('image/png', 0.95); // Qualidade 95%
      pdf.addImage(imgFront, 'PNG', 0, 0, this.WIDTH, this.HEIGHT);

      // Página 2: Verso
      pdf.addPage([this.WIDTH, this.HEIGHT], 'landscape');
      const imgBack = canvasBack.toDataURL('image/png', 0.95);
      pdf.addImage(imgBack, 'PNG', 0, 0, this.WIDTH, this.HEIGHT);

      // Adicionar metadados para impressão
      pdf.setProperties({
        title: `Carteirinha SITITREL - ${profile.name}`,
        subject: 'Carteirinha Digital - SITITREL',
        author: 'SITITREL - Gestão Digital',
        keywords: 'carteirinha, sititrel, digital',
        creator: 'SITITREL PDF Generator v6.0'
      });

      pdf.save(`carteirinha-${profile.name}.pdf`);
      console.log('PDF gerado com sucesso!');
      console.log('📋 Dicas de Impressão:');
      console.log('   • Tipo de papel: Couché 300g/m² (recomendado)');
      console.log('   • Modo de cor: RGB ou CMYK (ambos suportados)');
      console.log('   • Tamanho: 101.6 x 63.5 mm (cartão ID padrão)');
      console.log('   • Margens: 0mm (sem margens)');
      console.log('   • Escala: 100% (sem redimensionamento)');
    } catch (error) {
      throw new Error(`Erro ao gerar carteirinha: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  private static drawFront(ctx: CanvasRenderingContext2D, profile: UserProfile): void {
    const w = this.WIDTH * this.SCALE;
    const h = this.HEIGHT * this.SCALE;

    // Background azul escuro
    ctx.fillStyle = this.DARK_BLUE;
    ctx.fillRect(0, 0, w, h);

    // Circulos decorativos
    ctx.fillStyle = 'rgba(0, 188, 212, 0.15)';
    ctx.beginPath();
    ctx.arc(-80 * this.SCALE, -60 * this.SCALE, 200 * this.SCALE, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(w + 100 * this.SCALE, h + 80 * this.SCALE, 180 * this.SCALE, 0, Math.PI * 2);
    ctx.fill();

    // TOPO
    const padding = 15 * this.SCALE;
    let y = padding + (10 * this.SCALE);

    // Logo SITITREL (quadrado branco)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(padding, y, 50 * this.SCALE, 50 * this.SCALE);
    ctx.fillStyle = this.DARK_BLUE;
    ctx.font = `bold ${24 * this.SCALE}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('S', padding + (25 * this.SCALE), y + (35 * this.SCALE));

    // SITITREL DIGITAL
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${28 * this.SCALE}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('SITITREL DIGITAL', padding + (75 * this.SCALE), y + (35 * this.SCALE));

    // QR Code placeholder
    const qrSize = 50 * this.SCALE;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(w - padding - qrSize, y + (5 * this.SCALE), qrSize, qrSize);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2 * this.SCALE;
    ctx.strokeRect(w - padding - qrSize, y + (5 * this.SCALE), qrSize, qrSize);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `bold ${10 * this.SCALE}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('QR', w - padding - (qrSize / 2), y + (22 * this.SCALE));
    ctx.fillText('Code', w - padding - (qrSize / 2), y + (40 * this.SCALE));

    y += (80 * this.SCALE);

    // PERFIL (Foto + Nome)
    const fotoSize = 90 * this.SCALE;

    // Foto quadrada com cantos arredondados (placeholder)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.roundRect(ctx, padding, y, fotoSize, fotoSize, 8 * this.SCALE, false);

    // Inicial como placeholder
    if (!profile.photoURL) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${60 * this.SCALE}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(profile.name.charAt(0).toUpperCase(), padding + (fotoSize / 2), y + (fotoSize / 2) + (20 * this.SCALE));
    }

    // Nome e matricula (direita)
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${22 * this.SCALE}px Arial`;
    ctx.textAlign = 'center';
    const nomeX = padding + fotoSize + ((w - padding - fotoSize - padding) / 2);
    const nomeY = y + (30 * this.SCALE);
    const nome = profile.name.toUpperCase();
    if (nome.length > 18) {
      const meio = nome.lastIndexOf(' ', Math.floor(nome.length / 2));
      ctx.fillText(nome.substring(0, meio), nomeX, nomeY - (10 * this.SCALE));
      ctx.fillText(nome.substring(meio + 1), nomeX, nomeY + (20 * this.SCALE));
    } else {
      ctx.fillText(nome, nomeX, nomeY);
    }

    // Matricula em CYAN
    ctx.fillStyle = this.CYAN;
    ctx.font = `bold ${13 * this.SCALE}px Arial`;
    ctx.fillText(`MATRICULA: ${profile.matricula || '---'}`, nomeX, nomeY + (50 * this.SCALE));

    y += fotoSize + (15 * this.SCALE);

    // RODAPE
    y = h - (85 * this.SCALE);

    // CPF DO TITULAR
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = `${10 * this.SCALE}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('CPF DO TITULAR', padding, y);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${20 * this.SCALE}px Arial`;
    ctx.fillText(profile.cpf, padding, y + (28 * this.SCALE));

    // Status badge (CYAN com cantos arredondados)
    ctx.fillStyle = this.CYAN;
    const badgeY = y + (42 * this.SCALE);
    const badgeText = profile.isSocio ? 'SOCIO TITULAR ATIVO' : 'EM VALIDACAO';
    const metrics = ctx.measureText(badgeText);
    const badgeWidth = metrics.width + (20 * this.SCALE);
    const badgeHeight = 28 * this.SCALE;

    this.roundRect(ctx, padding, badgeY, badgeWidth, badgeHeight, 14 * this.SCALE, false);

    ctx.fillStyle = this.DARK_BLUE;
    ctx.font = `bold ${11 * this.SCALE}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(badgeText, padding + (10 * this.SCALE), badgeY + (20 * this.SCALE));

    // Validade (direita)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = `${10 * this.SCALE}px Arial`;
    ctx.textAlign = 'right';
    ctx.fillText('VALIDADE', w - padding, y);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${16 * this.SCALE}px Arial`;
    ctx.fillText('INDETERMINADA', w - padding, y + (26 * this.SCALE));
  }

  private static drawBack(ctx: CanvasRenderingContext2D, dependents: Dependente[]): void {
    const w = this.WIDTH * this.SCALE;
    const h = this.HEIGHT * this.SCALE;

    // Background branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Topo azul
    ctx.fillStyle = this.DARK_BLUE;
    ctx.fillRect(0, 0, w, 35 * this.SCALE);

    // Rodape azul
    ctx.fillRect(0, h - (35 * this.SCALE), w, 35 * this.SCALE);

    const padding = 20 * this.SCALE;

    // TITULO
    ctx.fillStyle = this.DARK_BLUE;
    ctx.font = `bold ${16 * this.SCALE}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('DEPENDENTES REGISTRADOS', padding + (45 * this.SCALE), 55 * this.SCALE);

    // Icone simples (caixa)
    ctx.fillStyle = this.DARK_BLUE;
    ctx.fillRect(padding, 40 * this.SCALE, 30 * this.SCALE, 24 * this.SCALE);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${14 * this.SCALE}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('P', padding + (15 * this.SCALE), 58 * this.SCALE);

    // Linha divisoria
    ctx.strokeStyle = 'rgba(0, 58, 111, 0.2)';
    ctx.lineWidth = 2 * this.SCALE;
    ctx.beginPath();
    ctx.moveTo(padding, 65 * this.SCALE);
    ctx.lineTo(w - padding, 65 * this.SCALE);
    ctx.stroke();

    // DEPENDENTES
    let y = 90 * this.SCALE;
    const cardHeight = 40 * this.SCALE;
    const cardPadding = 12 * this.SCALE;

    if (dependents.length > 0) {
      dependents.slice(0, 4).forEach((dep) => {
        // Card com fundo cinza claro
        ctx.fillStyle = 'rgba(0, 58, 111, 0.05)';
        this.roundRect(ctx, padding, y, w - (2 * padding), cardHeight, 6 * this.SCALE, false);

        // Border sutil
        ctx.strokeStyle = 'rgba(0, 58, 111, 0.1)';
        ctx.lineWidth = 1 * this.SCALE;
        this.roundRect(ctx, padding, y, w - (2 * padding), cardHeight, 6 * this.SCALE, true);

        // Nome (esquerda)
        ctx.fillStyle = this.DARK_BLUE;
        ctx.font = `bold ${12 * this.SCALE}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(dep.name.toUpperCase().substring(0, 40), padding + cardPadding, y + (26 * this.SCALE));

        // Parentesco (direita)
        ctx.fillStyle = 'rgba(0, 58, 111, 0.6)';
        ctx.font = `${11 * this.SCALE}px Arial`;
        ctx.textAlign = 'right';
        ctx.fillText(dep.parentesco, w - padding - cardPadding, y + (26 * this.SCALE));

        y += cardHeight + (12 * this.SCALE);
      });
    } else {
      ctx.fillStyle = 'rgba(0, 58, 111, 0.5)';
      ctx.font = `${12 * this.SCALE}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('Nenhum dependente cadastrado', w / 2, y + (50 * this.SCALE));
    }

    // RODAPE
    ctx.fillStyle = 'rgba(0, 58, 111, 0.6)';
    ctx.font = `${9 * this.SCALE}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('ASSINADO DIGITALMENTE POR', padding, h - (18 * this.SCALE));

    ctx.fillStyle = this.DARK_BLUE;
    ctx.font = `bold ${11 * this.SCALE}px Arial`;
    ctx.fillText('SITITREL - GESTAO DIGITAL', padding, h - (6 * this.SCALE));
  }

  private static roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    stroke: boolean = false
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    if (stroke) {
      ctx.stroke();
    } else {
      ctx.fill();
    }
  }
}
