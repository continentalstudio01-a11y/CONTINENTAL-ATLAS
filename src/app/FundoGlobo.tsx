import { useEffect, useRef } from 'react';
import { usePreferencias } from '../lib/hooks';

// Globo de vidro desenhado em canvas (seção 4.6): meridianos girando devagar,
// brilho e cáusticas nas cores do tema. Limite de quadros, pausa em segundo plano
// e três modos: ligado, economia e desligado (imagem estática).
export function FundoGlobo() {
  const { fundo, tema } = usePreferencias();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const economia = fundo === 'economia';
    const estatico = fundo === 'desligado';
    const intervalo = 1000 / (economia ? 15 : 30);
    let raf = 0;
    let ultimo = 0;

    const lerCores = () => {
      const cs = getComputedStyle(document.documentElement);
      return {
        linha: cs.getPropertyValue('--globo-linha').trim() || '15,27,49',
        brilho: cs.getPropertyValue('--globo-brilho').trim() || '255,255,255',
        halo: cs.getPropertyValue('--globo-halo').trim() || '95,136,180'
      };
    };
    let cores = lerCores();

    const redimensionar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.5 : 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      desenhar(performance.now());
    };

    function desenhar(t: number) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx!.clearRect(0, 0, w, h);
      const celular = w < 760;
      const R = celular ? Math.min(w * 0.62, h * 0.34) : Math.min(w * 0.33, h * 0.46);
      const cx = celular ? w * 0.66 : w * 0.72;
      const cy = celular ? h * 0.28 : h * 0.54;

      const halo = ctx!.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.7);
      halo.addColorStop(0, `rgba(${cores.halo},0.20)`);
      halo.addColorStop(1, `rgba(${cores.halo},0)`);
      ctx!.fillStyle = halo;
      ctx!.fillRect(0, 0, w, h);

      const esfera = ctx!.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.05, cx, cy, R);
      esfera.addColorStop(0, `rgba(${cores.brilho},0.60)`);
      esfera.addColorStop(0.55, `rgba(${cores.brilho},0.14)`);
      esfera.addColorStop(1, `rgba(${cores.brilho},0.05)`);
      ctx!.beginPath();
      ctx!.arc(cx, cy, R, 0, Math.PI * 2);
      ctx!.fillStyle = esfera;
      ctx!.fill();

      if (!economia) {
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(cx, cy, R, 0, Math.PI * 2);
        ctx!.clip();
        for (let i = 0; i < 3; i++) {
          const x = cx + R * 0.5 * Math.sin(t * 0.00013 + i * 2.1);
          const y = cy + R * 0.42 * Math.cos(t * 0.00011 + i * 1.3);
          const g = ctx!.createRadialGradient(x, y, 0, x, y, R * 0.42);
          g.addColorStop(0, `rgba(${cores.brilho},0.22)`);
          g.addColorStop(1, `rgba(${cores.brilho},0)`);
          ctx!.fillStyle = g;
          ctx!.fillRect(cx - R, cy - R, R * 2, R * 2);
        }
        ctx!.restore();
      }

      const rot = (t / 60000) * Math.PI * 2;
      const inc = 0.36;
      const cI = Math.cos(inc), sI = Math.sin(inc);
      const proj = (lat: number, lon: number): [number, number, number] => {
        const x = R * Math.cos(lat) * Math.sin(lon + rot);
        const y0 = R * Math.sin(lat);
        const z0 = R * Math.cos(lat) * Math.cos(lon + rot);
        return [cx + x, cy - (y0 * cI - z0 * sI), (y0 * sI + z0 * cI) / R];
      };
      const traco = (a: [number, number, number], b: [number, number, number]) => {
        const z = (a[2] + b[2]) / 2;
        const alfa = z > 0 ? 0.08 + 0.2 * z : 0.05 * (1 + z);
        ctx!.strokeStyle = `rgba(${cores.linha},${alfa.toFixed(3)})`;
        ctx!.beginPath();
        ctx!.moveTo(a[0], a[1]);
        ctx!.lineTo(b[0], b[1]);
        ctx!.stroke();
      };
      ctx!.lineWidth = 1;
      const passo = Math.PI / 24;
      for (let m = 0; m < 12; m++) {
        const lon = (m * Math.PI) / 6;
        for (let k = 0; k < 24; k++) {
          const l1 = -Math.PI / 2 + k * passo;
          traco(proj(l1, lon), proj(l1 + passo, lon));
        }
      }
      for (const graus of [-60, -30, 0, 30, 60]) {
        const lat = (graus * Math.PI) / 180;
        for (let k = 0; k < 48; k++) {
          const lon = (k * Math.PI) / 24;
          traco(proj(lat, lon), proj(lat, lon + Math.PI / 24));
        }
      }

      ctx!.beginPath();
      ctx!.arc(cx, cy, R, 0, Math.PI * 2);
      ctx!.strokeStyle = `rgba(${cores.linha},0.16)`;
      ctx!.lineWidth = 1.2;
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.ellipse(cx - R * 0.42, cy - R * 0.5, R * 0.2, R * 0.08, -0.6, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${cores.brilho},0.28)`;
      ctx!.fill();
    }

    const quadro = (t: number) => {
      raf = requestAnimationFrame(quadro);
      if (t - ultimo < intervalo) return;
      ultimo = t;
      desenhar(t);
    };
    const iniciar = () => { if (!estatico && !raf) raf = requestAnimationFrame(quadro); };
    const parar = () => { cancelAnimationFrame(raf); raf = 0; };
    const visibilidade = () => (document.hidden ? parar() : iniciar());

    redimensionar();
    iniciar();
    window.addEventListener('resize', redimensionar);
    document.addEventListener('visibilitychange', visibilidade);
    const obs = new MutationObserver(() => { cores = lerCores(); desenhar(performance.now()); });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
    return () => {
      parar();
      window.removeEventListener('resize', redimensionar);
      document.removeEventListener('visibilitychange', visibilidade);
      obs.disconnect();
    };
  }, [fundo, tema]);

  return <canvas ref={ref} className="fundo-globo" aria-hidden="true" />;
}
