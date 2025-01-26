(function (window) {
    "use strict";

    class Card extends HTMLElement {
        /** @type {Number} */
        _index;
        /** @type {Number} */
        _x;
        /** @type {Number} */
        _y;
        /** @type {Number} */
        _width;
        /** @type {Number} */
        _height;
        /** @type {HTMLDivElement} */
        _front;
        /** @type {HTMLDivElement} */
        _back;
        /** @type {HTMLDivElement} */
        _imprint = document.createElement("div");

        constructor() {
            super();
        }

        connectedCallback() {
            this._shadow = this.attachShadow({ mode: "open" });
            this._style = document.createElement("style");
            this._style.textContent = `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-size: calc(var(--base-size) * 2);
}

div {
    position: absolute;
    margin: 0 auto;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition-property: transform;
    transition-duration: 250ms;
    transition-timing-function: ease-in-out;
    border-radius: 10%;
}

.face {
    position: absolute;
    width: 100%;
    height: 100%;
    border: 2px solid var(--light-color);
    text-align: center;
    backface-visibility: hidden;
}

.front {
    cursor: not-allowed;
    pointer-events: none;
    background-color: var(--dark-color);
}

.back {
    transform: translateZ(-1px) rotateY(180deg);
    background-image: url(images/backface.png);
    background-repeat: repeat;
    background-size: 24px 24px;
    background-position: -4px 0;
    image-rendering: -moz-pixelated;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: pixelated;
    -ms-interpolation-mode: nearest-neighbor;
    cursor: pointer;
}

.face > * {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: center;
}

.upside-down {
    transform: rotateY(180deg);
    cursor: pointer;
}
`;
            this._container = document.createElement("div");
            this._container.addEventListener("click", this._onClick.bind(this));
            this._front = document.createElement("div");
            this._front.className = "front face";
            this._front.appendChild(this._imprint);
            this._back = document.createElement("div");
            this._back.className = "back face";
            this._container.appendChild(this._front);
            this._container.appendChild(this._back);
            this._container.className = "container upside-down";
            this._shadow.append(this._style, this._container);
        }

        static get observedAttributes() {
            return ["x", "y", "width", "height", "title"];
        }

        attributeChangedCallback(name, _oldValue, newValue) {
            switch (name) {
                case "x":
                    this.x = parseInt(newValue);
                    break;
                case "y":
                    this.y = parseInt(newValue);
                    break;
                case "width":
                    this.width = parseInt(newValue);
                    break;
                case "height":
                    this.height = parseInt(newValue);
                    break;
                case "text":
                    this.text = newValue;
                    break;
                default:
                    break;
            }
        }

        _onClick(e) {
            const target = e.target.classList.contains("container") ? e.target : e.target.parentNode;
            if (target.classList.contains("upside-down")) {
                window.dispatchEvent(new CustomEvent("cardclicked", { detail: { index: this.index } }));
            }
            target.classList.remove("upside-down");
            e.preventDefault();
        }

        hide() {
            this._container.classList.add("upside-down");
        }

        show() {
            this._container.classList.remove("upside-down");
        }

        /**
         * @returns {Number}
         */
        get x() {
            return this._x;
        }
        /**
         * @returns {Number}
         */
        get y() {
            return this._y;
        }
        /**
         * @returns {Number}
         */
        get index() {
            return this._index;
        }
        /**
         * @param {Number} x
         */
        set x(x) {
            this._x = x;
            this.style.left = `${x}px`;
        }
        /**
         * @param {Number} y
         */
        set y(y) {
            this._y = y;
            this.style.top = `${y}px`;
        }
        /**
         * @param {Number} w
         */
        set width(w) {
            this._width = w;
            this.style.width = `${w}px`;
        }
        /**
         * @param {Number} h
         */
        set height(h) {
            this._height = h;
            this.style.height = `${h}px`;
        }
        /**
         * @param {String} html
         */
        set html(html) {
            this._imprint.innerHTML = html;
        }
        /**
         * @param {Number} idx
         */
        set index(idx) {
            this._index = idx;
        }
    }

    /**
      * Custom web element representing the Numemory game.
      */
    class NumemoryGame extends HTMLElement {
        static DefaultNumCards = 10;
        static DefaultFrontVisibleDurationMs = 1000;

        /** 
         * Width and height in pixels of a single cell.
         * @type {object}
         */
        _cardSize = { width: 44, height: 58 };

        /**
         * Minimum space between cards and cards to table edge.
         * @type {Number}
         */
        _cardGap = 4;

        /**
         * Array of cards placed on the table
         * @type {Card[]}
         */
        _cards = [];

        /**
         * Current card index.
         * @type {Number}
         */
        _cardIndex = 0;

        /**
         * True, if players cannot interact with the game.
         * @type {Boolean}
         */
        _locked = false;

        /**
         * @type {HTMLElement}
         */
        _board;

        constructor() {
            super();
        }

        connectedCallback() {
            this._shadow = this.attachShadow({ mode: "open" });
            this._style = document.createElement("style");
            this._style.textContent = `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    touch-action: manipulation;
    font-size: calc(var(--card-height) / 2);
}
.table {
    position: relative;
    margin: 0 auto;
    width: var(--table-width);
    height: 100%;
}
.wrong {
    animation-name: shaking;
    animation-duration: 150ms;
    animation-delay: 250ms;
    animation-fill-mode: start;
    animation-iteration-count: 2;
    animation-timing-function: linear;
}
numemory-card {
    position: absolute;
}
@keyframes shaking {
    0% { transform: translateX(0) translateY(0) }
    10% { transform: translateX(5px) translateY(0) }
    20% { transform: translateX(-3px) translateY(0) }
    30% { transform: translateX(3px) translateY(1) }
    40% { transform: translateX(-1px) translateY(-5px) }
    50% { transform: translateX(0px) translateY(5px) }
    60% { transform: translateX(0px) translateY(-3px) }
    70% { transform: translateX(3px) translateY(-3px) }
    80% { transform: translateX(-3px) translateY(-2px) }
    90% { transform: translateX(3px) translateY(2px) }
    100% { transform: translateX(-2px) translateY(-1px) }
}
`;

            this._dynamicStyle = document.createElement("style");

            this._board = document.createElement("div");
            this._board.className = "table";
            this._board.setAttribute("role", "application");
            this._board.setAttribute("aria-label", "Numemory - A variant of the popular Memory game where you have to flip cards in the correct order");

            this._numCards = parseInt(this.getAttribute("n") || NumemoryGame.DefaultNumCards);

            this._shadow.append(this._style, this._dynamicStyle, this._board);

            window.addEventListener("resize", this._onResize.bind(this));
            window.addEventListener("touchstart", this._onTouchStart.bind(this), { passive: false });
            window.addEventListener("touchend", this._onTouchEnd.bind(this));
            window.addEventListener("cardclicked", this._onCardClicked.bind(this));
        }

        static get observedAttributes() {
            return ["n"];
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (name === "n" && oldValue !== newValue) {
                this._numCards = parseInt(newValue);
                this._generateCards();
            }
        }

        _noOverlaps(card) {
            return this._cards.every(existingCard =>
                card.x > existingCard.x + this._cardSize.width + this._cardGap ||
                card.x + this._cardSize.width + this._cardGap < existingCard.x ||
                card.y > existingCard.y + this._cardSize.height + this._cardGap ||
                card.y + this._cardSize.height + this._cardGap < existingCard.y);
        }

        /**
         * Check if the card fits on the table, i.e. does not cross the boundaries of `this._board`.
         * @param {Card} card 
         * @return {Boolean} `true` if card fits, `false` otherwise
         */
        _fitsOnTable(card) {
            const boardRect = this._board.getBoundingClientRect();
            const doesFit = (
                card.x >= 0 &&
                card.y >= 0 &&
                card.x + this._cardSize.width + this._cardGap < boardRect.width &&
                card.y + this._cardSize.height + this._cardGap < boardRect.height
            );
            return doesFit;
        }

        _isProperlyPlaced(card) {
            return this._noOverlaps(card) && this._fitsOnTable(card);
        }

        _generateCards() {
            do {
                this._cards = [];
                const boardRect = this._board.getBoundingClientRect();
                let restart = false;
                for (let i = 0; i < this._numCards && !restart; ++i) {
                    const card = document.createElement("numemory-card");
                    card.width = this._cardSize.width;
                    card.height = this._cardSize.height;
                    card.html = `<span>${i}</span>`;
                    card.index = i;
                    let tries = 0;
                    do {
                        if (++tries > 10) {
                            restart = true;
                            break;
                        }
                        card.x = Math.floor(Math.random() * (boardRect.width - this._cardSize.width));
                        card.y = Math.floor(Math.random() * (boardRect.height - this._cardSize.height));
                    }
                    while (!this._isProperlyPlaced(card) && !restart);
                    if (!restart)
                        this._cards.push(card);
                }
            }
            while (this._cards.length < this._numCards);
            this._board.replaceChildren(...this._cards);
        }

        _updateDynamicStyles() {
            const bodyRect = document.body.getBoundingClientRect();
            const scale = 1.4 * Math.min(bodyRect.width, bodyRect.height);
            this._cardSize.width = scale / this._numCards;
            this._cardSize.height = this._cardSize.width * 1.5;
            this._dynamicStyle.textContent = `
:host {
    --card-width: ${this._cardSize.width}px;
    --card-height: ${this._cardSize.height}px;
    --font-size: ${Math.floor(this._cardSize.width / 3)}px;
    --table-width: ${bodyRect.width}px;
    --table-height: ${bodyRect.height}px;
}
`;
        }

        _adjustCardSize() {
            this._updateDynamicStyles();
        }

        _onResize(_e) {
            this._adjustCardSize();
        }

        /** @param {TouchEvent} _e - not used */
        _onTouchStart(_e) {
            this._touchStartTime = performance.now();
        }

        /** @param {TouchEvent} e  */
        _onTouchEnd(e) {
            const currentTime = performance.now();
            const touchDuration = currentTime - this._touchStartTime;
            if (touchDuration < 400) {
                this._onClick(e);
            }
            const tapLength = currentTime - this._lastTapTime;
            if (tapLength < 500 && tapLength > 0) {
                e.preventDefault(); // prevent double-tap to zoom
            }
            this._lastTapTime = currentTime;
        }

        /** @param {CustomEvent} e  */
        _onCardClicked(e) {
            if (this._locked)
                return;
            if (e.detail.index !== this._cardIndex) {
                this.lock();
                this._board.classList.add("wrong");
                setTimeout(() => {
                    this.dispatchEvent(new CustomEvent("round", { detail: { round: ++this._round } }))
                    this._reset();
                }, NumemoryGame.DefaultFrontVisibleDurationMs);
            }
            else {
                if (++this._cardIndex === this._numCards) {
                    this.lock();
                    setTimeout(() => {
                        alert("You won!");
                        this.newGame();
                    })
                }
            }
        }

        _reset() {
            this.unlock();
            this._board.classList.remove("wrong");
            this._cardIndex = 0;
            this._cards.forEach(card => card.hide());
        }

        lock() {
            this._locked = true;
        }

        unlock() {
            this._locked = false;
        }

        start() {
            this._updateDynamicStyles();
            this._generateCards();
            this.newGame();
        }

        newGame() {
            this._generateCards();
            this._reset();
            this._round = 1;
            this.dispatchEvent(new CustomEvent("round", { detail: { round: 1 } }))
        }
    }

    let el = {};

    function main() {
        console.info("%cNumemory %cstarted.", "color:rgb(222, 156, 43); font-weight: bold", "color: initial; font-weight: normal;");

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/service-worker.js")
                .then(registration => {
                    console.info(`Service Worker registered with scope "${registration.scope}"`);
                })
                .catch(error => {
                    console.error(`Service Worker registration failed: ${error}`);
                });
        }

        customElements.define("numemory-card", Card);
        customElements.define("numemory-game", NumemoryGame);
        el.game = document.querySelector("numemory-game");
        el.rounds = document.querySelector("#rounds");

        el.game.addEventListener("round", e => {
            el.rounds.textContent = e.detail.round;
        });

        el.game.start();
    }

    window.addEventListener("load", main);
})(window);
