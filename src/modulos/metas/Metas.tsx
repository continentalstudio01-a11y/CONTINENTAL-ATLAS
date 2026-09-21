import { useEffect, useState } from 'react';
import { Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { Barra, Botao, BotaoIcone, CabecalhoTela, Campo, Card, Chip, useAvisar } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { salvar } from '../../lib/repo';
import { idDeterministico } from '../../lib/ids';
import { diasNoMes, hoje, mesDe, moeda, numero, somarMeses, tituloMes } from '../../lib/formato';
import { faturamentoDoMes, novosClientesDoMes } from '../../lib/indicadores';
import type { Cliente, Lancamento, Meta } from '../../lib/tipos';

export const idMeta = (mes: string) => idDeterministico(`meta:${mes}`);

export function Metas() {
  const avisar = useAvisar();
  const metas = useLista<Meta>('metas') ?? [];
  const lancs = useLista<Lancamento>('lancamentos') ?? [];
  const clientes = useLista<Cliente>('clientes') ?? [];
  const [mes, setMes] = useState(mesDe(hoje()));
  const meta = metas.find((m) => m.mes === mes);
  const [fat, setFat] = useState('');
  const [novos, setNovos] = useState('');
  useEffect(() => { setFat(meta ? String(meta.faturamento_alvo) : ''); setNovos(meta ? String(meta.novos_clientes_alvo) : ''); }, [meta?.id, meta?.atualizado_em, mes]);

  const realFat = faturamentoDoMes(lancs, mes);
  const realNovos = novosClientesDoMes(clientes, mes);
  const atual = mes === mesDe(hoje());
  const dia = Number(hoje().slice(8));
  const projecao = atual && dia > 0 ? (realFat / dia) * diasNoMes(mes) : null;

  const gravar = async () => {
    await salvar<Meta>('metas', { id: idMeta(mes), mes, faturamento_alvo: numero(fat), novos_clientes_alvo: Math.round(numero(novos)) });
    avisar('Metas salvas');
  };
  const copiarAnterior = () => {
    const ant = metas.find((m) => m.mes === somarMeses(mes, -1));
    if (!ant) { avisar('O mês anterior não tem metas.'); return; }
    setFat(String(ant.faturamento_alvo)); setNovos(String(ant.novos_clientes_alvo));
  };
  const historico = Array.from({ length: 6 }, (_, i) => somarMeses(mesDe(hoje()), -i - 1));

  return (
    <>
      <CabecalhoTela titulo="Metas" icone={<Target size={28} strokeWidth={1.6} />} subtitulo="Faturamento e novos clientes de cada mês" />
      <div className="linha" style={{ gap: 4, marginBottom: 16 }}>
        <BotaoIcone rotulo="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}><ChevronLeft size={20} /></BotaoIcone>
        <h2 className="titulo-card" style={{ minWidth: 190, textAlign: 'center' }}>{tituloMes(mes)}</h2>
        <BotaoIcone rotulo="Próximo mês" onClick={() => setMes(somarMeses(mes, 1))}><ChevronRight size={20} /></BotaoIcone>
      </div>
      <div className="grade grade-2">
        <Card titulo="Faturamento">
          <Campo rotulo="Meta do mês"><input className="entrada" inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="0,00" /></Campo>
          <p className="kpi-mini" style={{ margin: '18px 0 10px' }}>{moeda(realFat)}</p>
          <Barra valor={realFat} max={numero(fat)} />
          <p className="secundario pequeno" style={{ marginTop: 10 }}>
            {numero(fat) > 0 ? `${Math.round((realFat / numero(fat)) * 100)}% da meta` : 'Defina uma meta para acompanhar o progresso.'}
            {projecao !== null && numero(fat) > 0 && ` Nesse ritmo, o mês fecha em ${moeda(projecao)}.`}
          </p>
        </Card>
        <Card titulo="Novos Clientes">
          <Campo rotulo="Meta do mês"><input className="entrada" type="number" min="0" value={novos} onChange={(e) => setNovos(e.target.value)} /></Campo>
          <p className="kpi-mini" style={{ margin: '18px 0 10px' }}>{realNovos}</p>
          <Barra valor={realNovos} max={numero(novos)} />
          <p className="secundario pequeno" style={{ marginTop: 10 }}>{numero(novos) > 0 ? `${realNovos} de ${numero(novos)}` : 'Defina uma meta para acompanhar o progresso.'}</p>
        </Card>
      </div>
      <div className="linha" style={{ justifyContent: 'flex-end', margin: '18px 0 26px' }}>
        <Botao variante="fantasma" onClick={copiarAnterior}>Copiar do mês anterior</Botao>
        <Botao variante="primario" onClick={gravar}>Salvar metas</Botao>
      </div>
      <Card titulo="Últimos 6 Meses">
        <div className="lista">
          {historico.map((m) => {
            const mt = metas.find((x) => x.mes === m);
            const r = faturamentoDoMes(lancs, m);
            return (
              <div key={m} className="item" style={{ cursor: 'default' }}>
                <div className="cresce"><div className="titulo">{tituloMes(m)}</div><div className="pequeno secundario">{moeda(r)}{mt ? ` de ${moeda(mt.faturamento_alvo)}` : ''}</div></div>
                {mt && mt.faturamento_alvo > 0 && (r >= mt.faturamento_alvo ? <Chip cor="ok">Meta batida</Chip> : <Chip>Não batida</Chip>)}
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
