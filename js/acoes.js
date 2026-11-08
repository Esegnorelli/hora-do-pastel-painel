// Texto curto de ação para cada pendência da conferência. Usa só campos do CSV; não inventa dados.

import { num, nf0 } from './format.js';

const tem = (u, alerta) => (u.alertas || '').split(';').map((s) => s.trim()).includes(alerta);

const telefonesPlanilha = (u) => (u.telefone_planilha || '').split(' / ').map((s) => s.trim()).filter(Boolean);

// Celular com DDD e só 8 dígitos (ex.: "(51) 9983-0040"): número antigo, sem o 9 inicial. Não dá para mandar
// colocar na ficha sem confirmar.
const celularSem9 = (tel) => /^\(\d{2}\) [6-9]\d{3}-\d{4}$/.test(tel);
const avisoSem9 = (tels) => (tels.some(celularSem9)
  ? ' Confirme o número antes: na planilha ele está sem o 9 inicial de celular.'
  : '');

export function acoesDaUnidade(u) {
  const out = [];
  if (u.situacao === 'Não encontrada') {
    const tel = telefonesPlanilha(u)[0];
    out.push(`Crie ou reivindique a ficha no Perfil da Empresa no Google com o endereço ${u.endereco_planilha}${tel ? ` e o telefone ${tel}` : ''}.${avisoSem9(tel ? [tel] : [])}`);
    return out;
  }
  if (u.situacao === 'Fora da planilha') {
    out.push(`Descubra de quem é a ficha em ${u.endereco_maps}${u.telefone_maps ? `, telefone ${u.telefone_maps}` : ''}: se for da rede, inclua na planilha; se não for, peça ao Google para corrigir o nome.`);
    return out;
  }
  if (u.status_rede === 'Inativa' && u.no_maps === 'sim') {
    // Loja inativa: corrigir telefone ou endereço não adianta; o que importa é a ficha deixar de aparecer como aberta.
    out.push('A loja está inativa na planilha: marque a ficha como "fechada permanentemente" no Perfil da Empresa, ou atualize a planilha se a loja voltou a abrir.');
    return out;
  }
  if (u.telefone_confere === 'não') {
    const tels = telefonesPlanilha(u);
    const alvo = tels.length > 1 ? `um dos telefones da planilha (${tels.join(' ou ')})` : tels[0];
    out.push(`Atualize o telefone da ficha para ${alvo} (hoje está ${u.telefone_maps}), ou corrija a planilha se o número da ficha for o certo.${avisoSem9(tels)}`);
  }
  if (u.endereco_confere === 'não') {
    out.push(`Confira o endereço: a ficha diz ${u.endereco_maps}; a planilha, ${u.endereco_planilha}. Corrija o lado que estiver errado.`);
  }
  if (tem(u, 'Em implantação na planilha, mas já está no Maps')) {
    const n = num(u.avaliacoes);
    out.push(`Atualize o status na planilha: a ficha já está no Maps${n != null ? ` com ${nf0.format(n)} avaliações` : ''}.`);
  }
  if (tem(u, 'Poucas avaliações')) {
    const n = num(u.avaliacoes);
    out.push(`Peça avaliações aos clientes: a ficha tem só ${n != null ? nf0.format(n) : 'poucas'}.`);
  }
  return out;
}

// Unidades com algo a fazer, na ordem da conferência (mais grave primeiro).
export const PRECISA_ACAO = ['Não encontrada', 'Fora da planilha', 'Divergência'];
