# Marmore Studio — site estático

Site completo em português (HTML + CSS + JS + imagens + vídeos), sem WordPress e sem dependências externas.

## Como abrir

As animações em WebGL (abertura da home, cards com distorção) **precisam de um servidor local**:
abrir o `index.html` direto pelo explorador de arquivos não funciona.

- VS Code: clique com o botão direito em `index.html` → **Open with Live Server**
- ou, no terminal, dentro desta pasta: `npx http-server -p 5501`

## Estrutura

```
site/
├── index.html                          Início (abertura líquida, slider, cards)
├── linha-luxo.html                     Linha Luxo
├── linha-classica.html                 Linha Clássica
├── nossa-historia.html                 Nossa História (morphing, vídeos, contadores)
├── blog.html                           Histórias (lista lida de data/posts.json)
├── tendencias-de-cozinha.html          Artigos
├── tendencias-de-luxo.html
├── materiais-naturais-na-cozinha.html
├── tendencias-de-cores.html
├── data/
│   └── posts.json                      Artigos exibidos em blog.html
└── assets/
    ├── css/
    │   ├── main.css                    Estilos do tema + animações CSS
    │   ├── custom.css                  Personalizações (rodapé sem mapa, títulos da abertura)
    │   └── vendor/                     glide.css, swiper.css, wp-base.css
    ├── js/
    │   ├── home-hero.js                Abertura da home: duas imagens com transição líquida (WebGL)
    │   ├── config.js                   Caminhos globais (directory_uri, admin_url)
    │   ├── manifest.js                 Runtime do webpack (carrega blog.js/popup.js)
    │   ├── vendor.js                   Vue, axios etc.
    │   ├── app.js                      Demais animações (GSAP, scroll, cursor, cards, morphing)
    │   ├── blog.js / popup.js          Blog e popup "Fale Conosco" (carregados sob demanda)
    │   └── libs/                       polyfill, Swiper, ThrowProps (GSAP)
    ├── img/
    │   ├── bg/                         Fundos (luxury-bg.jpg e classic-bg.jpg são as da abertura)
    │   ├── morphing/                   Imagens das transições
    │   ├── sample/                     Displacement maps e sliders
    │   ├── uploads/                    Imagens dos artigos
    │   └── icons/                      Logo (logo.svg, logo-2.svg), favicon, ícones
    ├── video/                          1.mp4, 2.mp4, 3.mp4
    └── fonts/                          Freight Big, Gilroy
```

## Abertura da home (`assets/js/home-hero.js`)

- Mouse na metade esquerda → **Linha Luxo**; metade direita → **Linha Clássica**.
  A troca é uma onda líquida que atravessa a tela, com refração e um brilho dourado na borda.
- Em celular/tablet (sem mouse) troca sozinha a cada 5 s.
- Sem WebGL, mostra a foto estática. Com "reduzir movimento" ativado no sistema, faz só um fade.
- Para ajustar: no topo do arquivo, `IMAGES` (as duas fotos), `DURATION` (tempo da troca),
  `AUTO_DELAY` (intervalo no celular) e `DARKEN` (quanto escurecer as fotos).
- Os nomes "Linha Luxo" / "Linha Clássica" ficam no `index.html` (`.hero-line`) e o estilo em `custom.css`.

## O que personalizar

- **Logo / favicon**: `assets/img/icons/logo.svg`, `logo-2.svg`, `favicon.svg` (monograma genérico "M").
- **Contatos e endereços**: rodapé de cada página + `assets/js/popup.js` (procure por `+55 00` e `Rua Exemplo`).
- **Redes sociais**: links `href="#"` no cabeçalho.
- **Artigos do blog**: `data/posts.json` (`id`, `title`, `image`, `permalink`).

## Limitações

- O formulário "Fale Conosco" aparece e anima, mas **não envia**: o original postava para o
  WordPress. Ligue a um serviço de formulário (Formspree, backend próprio etc.) em `popup.js`.
- Três imagens da Nossa História (`set1Medium4`, `set1Small3`, `set1Small4a`) já estavam quebradas (404)
  no site original; foram trocadas por imagens parecidas do mesmo conjunto.
- As fontes (Freight, Gilroy) e as fotos vieram do site de referência; para uso comercial,
  troque por material próprio ou licenciado.
