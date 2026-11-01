# Tabuleiro Manual

Um tabuleiro clicável, sem regras.

Não há turnos, não há jogadas válidas ou inválidas, não há vencedor. Cada jogador
(Batman e Homem-Aranha) tem seus **buckets** de peças, um de cada lado do tabuleiro,
e as peças são levadas para o tabuleiro arrastando.

Ao iniciar, o jogo pergunta:

- qual tabuleiro usar: um dos 35 de `tabuleiros Giovani Ext.pptx`, na ordem dos
  slides — Pong Hau K'i (de 5 e de 7 pontos), 3×3 em X, com diagonais, losango,
  com centros, com centros ligados e simples, Shisima, Trilha pequena, Trilha,
  Morabaraba, Trilha com cruz, Trilha com X, Pentágonos, Tsoro Yematatu,
  Triângulo, Coroa, Grades 4×4, 5×5 e 5×4, 4×4 em X, Alquerque, Gravata, Gravata
  grande, Losangos, Dois e Três círculos, Hexágono, Estrela, Damas 4×4, 6×6 e
  8×8, Círculo com arcos ou Grade com laços. Cada um aparece só como uma
  miniatura, sem o nome na tela. Os pontos que no slide têm outra cor (um
  centro, as fileiras onde as peças começam) aparecem como anéis;
- quantos buckets cada jogador tem (1 a 3);
- com quantas peças cada bucket começa (0 a 99 — um bucket vazio serve para
  ir juntando peças durante o jogo);
- a cor de cada bucket: vermelho, laranja, amarelo, verde, azul, roxo, rosa,
  marrom ou branco. Cada cor só pode estar em um bucket, nem o mesmo jogador
  nem o adversário a repetem; as que já estão em uso aparecem riscadas. Por
  padrão o Batman fica com amarelo, roxo e azul e o Homem-Aranha com vermelho,
  verde e laranja.

Cada bucket mostra uma peça na sua cor e, no canto, quantas ainda restam nele.
As peças levam a cor do bucket de onde saíram e ficam com ela aonde forem: uma
peça que entra num bucket de outra cor fica numa pilha ao lado dele, uma pilha
por cor.

É o equivalente digital de um tabuleiro físico com peças na mão: serve para montar
posições, demonstrar situações em aula, estudar um problema ou só brincar.

---

## Tecnologia

Vanilla JavaScript (ES modules), HTML e CSS — sem frameworks, sem build step.
O tabuleiro é desenhado como SVG inline.

---

## Como usar

| Ação | Efeito |
|------|--------|
| Arrastar do bucket para um ponto vazio | Coloca uma peça daquele bucket |
| Arrastar uma peça no tabuleiro | Move a peça para outro ponto vazio |
| Arrastar uma peça para um bucket do mesmo jogador | Devolve a peça: no bucket da cor dela, volta para a contagem; em outro, fica numa pilha ao lado dele, com a sua cor (borda contínua) |
| Arrastar uma peça para um bucket do adversário | Captura a peça: ela fica como troféu ao lado desse bucket, numa pilha por cor (borda tracejada) |
| Arrastar de um bucket ou de uma pilha direto para outro bucket | Passa a peça sem usar o tabuleiro, do mesmo jeito que se viesse dele |
| Arrastar de uma pilha para um ponto vazio | Recoloca uma peça daquela cor (ela continua sendo de quem era) |
| Desfazer | Reverte a última alteração |
| Limpar tabuleiro | Devolve cada peça ao bucket (ou à pilha) de onde saiu |
| Novo jogo | Pergunta de novo tabuleiro, buckets, peças e cores e recomeça |

Soltar em um lugar inválido (ponto ocupado, fora do tabuleiro) cancela o
movimento. O arrasto usa pointer events, então funciona com mouse e com toque.

---

## Como rodar localmente

O projeto usa ES modules, então precisa ser servido por HTTP (abrir o `index.html`
direto pelo sistema de arquivos não funciona).

```bash
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

---

## Estrutura

```
index.html        Marcação da página
css/style.css     Estilos
js/boards.js      Os tabuleiros disponíveis: pontos, linhas e curvas de cada um
js/board.js       Desenho do tabuleiro e das peças em SVG
js/drag.js        Arrastar e soltar com pointer events
js/app.js         Estado do tabuleiro e dos buckets, histórico e ligação com a interface
```

### Trocar as figuras

As duas figuras são SVG desenhado à mão em `js/board.js`: o array `FIGURES` define
o nome e a cor de cada uma, e as funções `batIcon` e `spiderIcon` desenham os
ícones (um morcego e uma aranha estilizados, arte própria — não são os logos
oficiais das marcas). Para trocar por outras figuras, basta substituir essas
funções e as cores.

As cores que um bucket pode ter ficam no array `PALETTE`, no mesmo arquivo;
uma cor nova ali aparece sozinha na escolha de cores do início do jogo. Elas
foram ajustadas para nenhuma se confundir com outra nem com o ciano das linhas
do tabuleiro, então uma cor nova precisa ficar bem longe de todas elas.

### Adicionar um tabuleiro

Os tabuleiros ficam em `js/boards.js`, no array `LAYOUTS`, na ordem dos slides de
`tabuleiros Giovani Ext.pptx`. Cada um tem um `id`, um `name`, os `points`
(posição de cada ponto), as `lines` (cada linha é uma lista de índices de pontos,
desenhada na ordem) e, se precisar, `curves` (círculos e arcos, como os laços da
grade) e `marked` (pontos desenhados como anel). Cada tabuleiro é montado na
medida que for mais cômoda, e `fit` o encaixa no quadrado de 300×300 mantendo a
proporção.

Há funções que montam os formatos comuns: `grid` para grades (inteiras ou
recortadas, com todas as diagonais, só as do padrão do Alquerque ou só as do
padrão oposto), `rings` para os anéis concêntricos das trilhas e dos pentágonos,
`circles` para círculos cortados por diâmetros, e `wheel`, `pyramid`, `bowtie`,
`diamonds`, `star` e `checkers`. Para qualquer outro formato, `figure` recebe os
pontos e as linhas dadas só pelos cantos: cada linha inclui sozinha todo ponto
que estiver no caminho. O tamanho das peças e da área de soltar se ajusta sozinho
à distância entre os pontos, e o tabuleiro novo aparece na tela inicial
automaticamente.
