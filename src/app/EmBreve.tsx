import { SECOES } from './secoes';
import { CabecalhoTela, Card } from '../componentes/ui';

export function EmBreve({ rota }: { rota: string }) {
  const s = SECOES.find((x) => x.rota === rota)!;
  return (
    <>
      <CabecalhoTela titulo={s.rotulo} icone={<s.icone size={28} strokeWidth={1.6} />} subtitulo={`Chega na Fase ${s.fase}`} />
      <Card>
        <p style={{ fontSize: 17, maxWidth: 640 }}>{s.resumo}</p>
        <p className="secundario pequeno" style={{ marginTop: 14 }}>
          Especificação completa na seção {s.secaoEspec} de docs/especificacao-continental-atlas.md.
        </p>
      </Card>
    </>
  );
}
