# Tabuleiro Manual

Um tabuleiro clicável, sem regras.

Não há turnos, não há jogadas válidas ou inválidas, não há vencedor. Cada jogador
(Batman e Homem-Aranha) tem seus **buckets** de peças, um de cada lado do tabuleiro,
e as peças são levadas para o tabuleiro arrastando.

Ao iniciar, o jogo pergunta:

- qual tabuleiro usar: 3×3 com diagonais, 3×3 simples, Grade 4×4, Shisima
  (octógono), Alquerque 5×5, Fanorona 9×5, Jogo da Onça, Trilha pequena, Trilha,
  Morabaraba, Resta Um (cruz), Hexágono, Triângulo ou Estrela;
- quantos buckets cada jogador tem (1 a 3);
- com quantas peças cada bucket começa (0 a 99 — um bucket vazio serve para
  ir juntando peças durante o jogo);
- a cor de cada bucket: vermelho, laranja, amarelo, verde, azul, roxo, rosa,
  marrom ou branco. Cada cor só pode estar em um bucket, nem o mesmo jogador
  nem o adversário a repetem; as que já estão em uso aparecem riscadas. Por
  padrão o Batman fica com amarelo, roxo e azul e o Homem-Aranha com vermelho,
  verde e laranja.

Cada bucket mostra uma peça na sua cor e, no canto, quantas ainda restam nele.
As peças levam a cor do bucket de onde saíram.

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
| Arrastar uma peça para um bucket do mesmo jogador | Devolve a peça ao bucket |
| Arrastar uma peça para um bucket do adversário | Captura a peça: ela fica como troféu ao lado desse bucket, numa pilha por cor |
| Arrastar de um bucket direto para um bucket do adversário | Passa a peça sem usar o tabuleiro: vira troféu dele (ou, vindo de uma pilha de troféus, volta a ser peça normal do dono) |
| Arrastar de uma pilha de troféus para um ponto vazio | Recoloca uma peça capturada daquela cor (ela continua sendo do adversário) |
| Desfazer | Reverte a última alteração |
| Limpar tabuleiro | Devolve cada peça ao bucket (ou à pilha de troféus) de onde saiu |
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
js/boards.js      Os tabuleiros disponíveis: pontos e linhas de cada um
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

Os tabuleiros ficam em `js/boards.js`, no array `LAYOUTS`. Cada um tem um `id`,
um `name`, os `points` (posição de cada ponto num quadrado de 300×300) e as
`lines` (cada linha é uma lista de índices de pontos, desenhada na ordem). Há
funções que montam os formatos comuns: `cellBoard` para grades (inteiras ou
recortadas, com ou sem as diagonais do Alquerque), `rings` para os quadrados
concêntricos das trilhas, `wheel` para polígonos com centro, e `hexagon`,
`triangle` e `star`. O tamanho das peças e da área de soltar se ajusta sozinho à distância
entre os pontos, e o tabuleiro novo aparece na tela inicial automaticamente.
