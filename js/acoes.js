// Texto curto de ação para cada pendência da conferência. Quando a pendência foi checada na internet
// (colunas verificacao_* do CSV), a ação verificada vem primeiro; senão, a ação sai só dos campos do CSV.

import { num, nf0 } from './format.js';

const tem = (u, alerta) => (u.alertas || '').split(';').map((s) => s.trim()).includes(alerta);

const telefonesPlanilha = (u) => (u.telefone_planilha || '').split(' / ').map((s) => s.trim()).filter(Boolean);

// Celular com DDD e só 8 dígitos (ex.: "(51) 9983-0040"): número antigo, sem o 9 inicial. Não dá para mandar
// colocar na ficha sem confirmar.
const celularSem9 = (tel) => /^\(\d{2}\) [6-9]\d{3}-\d{4}$/.test(tel);
const avisoSem9 = (tels) => (tels.some(celularSem9)
  ? ' Confirme o número antes: na planilha ele está sem o 9 inicial de celular.'
  : '');

// Pesquisa na internet sobre a unidade (ou null se não houve).
export function verificacao(u) {
  if (!u.verificacao_acao) return null;
  const [a, m, d] = (u.verificado_em || '').split('-');
  return {
    resumo: u.verificacao_resumo,
    acao: u.verificacao_acao,
    confianca: u.verificacao_confianca,
    status: u.verificacao_status,
    fontes: [...new Set((u.verificacao_fontes || '').split(';').map((s) => s.trim()).filter(Boolean))],
    data: d ? `${d}/${m}/${a}` : ''
  };
}

// Ação verificada primeiro; depois as ações da conferência sobre assuntos que a pesquisa não respondeu.
export function acoesDaUnidade(u) {
  const conf = acoesPelaConferencia(u);
  const v = verificacao(u);
  // Unidade que passou a conferir: a pesquisa antiga não vale mais.
  if (!v || !PRECISA_ACAO.includes(u.situacao)) return conf.map((a) => a.texto);
  const cobre = {
    ficha: true,
    telefone: Boolean(u.verificacao_telefone),
    endereco: Boolean(u.verificacao_endereco),
    status: v.status !== 'não confirmado',
    avaliacoes: /avali/i.test(v.acao)
  };
  return [v.acao, ...conf.filter((a) => !cobre[a.assunto]).map((a) => a.texto)];
}

function acoesPelaConferencia(u) {
  if (u.situacao === 'Não encontrada') {
    const tel = telefonesPlanilha(u)[0];
    return [{ assunto: 'ficha', texto: `Crie ou reivindique a ficha no Perfil da Empresa no Google com o endereço ${u.endereco_planilha}${tel ? ` e o telefone ${tel}` : ''}.${avisoSem9(tel ? [tel] : [])}` }];
  }
  if (u.situacao === 'Fora da planilha') {
    return [{ assunto: 'ficha', texto: `Descubra de quem é a ficha em ${u.endereco_maps}${u.telefone_maps ? `, telefone ${u.telefone_maps}` : ''}: se for da rede, inclua na planilha; se não for, peça ao Google para corrigir o nome.` }];
  }
  if (u.status_rede === 'Inativa' && u.no_maps === 'sim') {
    // Loja inativa: corrigir telefone ou endereço não adianta; o que importa é a ficha deixar de aparecer como aberta.
    return [{ assunto: 'status', texto: 'A loja está inativa na planilha: marque a ficha como "fechada permanentemente" no Perfil da Empresa, ou atualize a planilha se a loja voltou a abrir.' }];
  }
  const out = [];
  if (u.telefone_confere === 'não') {
    const tels = telefonesPlanilha(u);
    const alvo = tels.length > 1 ? `um dos telefones da planilha (${tels.join(' ou ')})` : tels[0];
    out.push({ assunto: 'telefone', texto: `Atualize o telefone da ficha para ${alvo} (hoje está ${u.telefone_maps}), ou corrija a planilha se o número da ficha for o certo.${avisoSem9(tels)}` });
  }
  if (u.endereco_confere === 'não') {
    out.push({ assunto: 'endereco', texto: `Confira o endereço: a ficha diz ${u.endereco_maps}; a planilha, ${u.endereco_planilha}. Corrija o lado que estiver errado.` });
  }
  if (tem(u, 'Em implantação na planilha, mas já está no Maps')) {
    const n = num(u.avaliacoes);
    out.push({ assunto: 'status', texto: `Atualize o status na planilha: a ficha já está no Maps${n != null ? ` com ${nf0.format(n)} avaliações` : ''}.` });
  }
  if (tem(u, 'Poucas avaliações')) {
    const n = num(u.avaliacoes);
    out.push({ assunto: 'avaliacoes', texto: `Peça avaliações aos clientes: a ficha tem só ${n != null ? nf0.format(n) : 'poucas'}.` });
  }
  return out;
}

// Unidades com algo a fazer, na ordem da conferência (mais grave primeiro).
export const PRECISA_ACAO = ['Não encontrada', 'Fora da planilha', 'Divergência'];
