import { Link } from 'react-router-dom';
import { Circle, CheckCircle2 } from 'lucide-react';
import { Chip } from '../../componentes/ui';
import { salvar, agora } from '../../lib/repo';
import { dataCurta, hoje } from '../../lib/formato';
import type { Cliente, Tarefa } from '../../lib/tipos';

export async function alternarTarefa(t: Tarefa) {
  const concluir = t.status !== 'concluida';
  await salvar<Tarefa>('tarefas', { id: t.id, status: concluir ? 'concluida' : 'aberta', concluida_em: concluir ? agora() : null });
}

const rotuloPrioridade = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

export function ItemTarefa({ t, cliente, aoAbrir, mostrarCliente = true }: { t: Tarefa; cliente?: Cliente; aoAbrir?: () => void; mostrarCliente?: boolean }) {
  const feita = t.status === 'concluida';
  const atrasada = !feita && !!t.prazo && t.prazo < hoje();
  return (
    <div className={`item ${feita ? 'feito' : ''} ${atrasada ? 'atrasado' : ''}`} style={{ cursor: 'default' }}>
      <button className="btn btn-fantasma btn-icone" aria-label={feita ? 'Reabrir tarefa' : 'Concluir tarefa'} onClick={() => alternarTarefa(t)}>
        {feita ? <CheckCircle2 size={22} strokeWidth={1.7} color="var(--ok)" /> : <Circle size={22} strokeWidth={1.5} />}
      </button>
      <button className="cresce" style={{ background: 'none', border: 0, textAlign: 'left', cursor: aoAbrir ? 'pointer' : 'default', padding: 0 }} onClick={aoAbrir}>
        <div className="titulo">{t.titulo}</div>
        <div className="linha pequeno secundario" style={{ gap: 6, marginTop: 3 }}>
          {mostrarCliente && cliente && <Link to={`/clientes/${cliente.id}`} onClick={(e) => e.stopPropagation()}>{cliente.nome}</Link>}
          {t.prazo && <span>{atrasada ? `Atrasada desde ${dataCurta(t.prazo)}` : `Prazo ${dataCurta(t.prazo)}`}</span>}
          {t.prioridade === 'alta' && <Chip cor="erro">{rotuloPrioridade.alta}</Chip>}
        </div>
      </button>
    </div>
  );
}
