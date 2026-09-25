# Tabuleiro Manual

Um tabuleiro clicável, sem regras.

Não há turnos, não há jogadas válidas ou inválidas, não há vencedor. Cada ponto do
tabuleiro simplesmente alterna entre três estados a cada clique:

```
vazio  →  peça clara  →  peça escura  →  vazio
```

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
| Clique | Avança a figura do ponto |
| Clique direito | Volta a figura do ponto |
| Tab / Shift+Tab | Navega entre os pontos |
| Enter ou Espaço | Avança a figura do ponto em foco |
| Backspace | Volta a figura do ponto em foco |
| Desfazer | Reverte a última alteração |
| Limpar tabuleiro | Esvazia todos os pontos |

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
js/board.js       Geometria e desenho do tabuleiro em SVG
js/app.js         Estado dos pontos, histórico e ligação com a interface
```

### Trocar o tabuleiro

A geometria fica toda em `js/board.js`: o array `PTS` define a posição de cada
ponto e `BOARD_LINES` define as linhas desenhadas entre eles. Alterando esses dois
valores o resto (cliques, contagem, desfazer) se ajusta sozinho.
