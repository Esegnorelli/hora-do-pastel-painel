# Unidades no Google Maps — Hora do Pastel

Site estático de uso interno: conferência das unidades no Google Maps e concorrência ao redor de cada loja ativa.

- `index.html`: a página
- `css/app.css`: tokens de cor (claro e escuro) e layout; `css/print.css`: relatório impresso
- `js/main.js`: entrada; `js/data.js` (carga e resumos), `js/format.js` (números em pt-BR), `js/tabs.js` (abas, links, tema),
  `js/ui.js` (tooltip, tabelas, estados, CSV), `js/views/` (uma por aba), `js/charts/` (um por gráfico)
- `data/`: `unidades-maps.csv` e `concorrentes.csv`, gerados pelo pipeline (fora deste repositório)

Impressão: com a aba de concorrência aberta, imprimir (Ctrl+P) gera uma página A4 da loja escolhida, com os filtros em vigor.

Segurança: a CSP fica em `vercel.json`. O script curto no `<head>` do `index.html` (tema e aba antes da primeira pintura)
entra na CSP pelo hash sha256; se mudar o script, recalcule o hash
(`printf '%s' '<conteúdo>' | openssl dgst -sha256 -binary | openssl base64 -A`). Bibliotecas de CDN só com versão exata e SRI.

Links diretos: `#visao`, `#conferencia`, `#concorrencia`, `#loja-0002` (concorrência da loja 0002).

Não tem build. Para atualizar os dados, rode o pipeline (`python3 build_data.py`), confira e faça push: a Vercel publica sozinha.
Para ver localmente: `python3 -m http.server 8765` e abra `http://127.0.0.1:8765/`.
