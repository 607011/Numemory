/*
    Copyright (c) 2024 Oliver Lau <oliver@ersatzworld.net>

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/
(function (window) {
    "use strict";

    const VERSION = "1.0.0-IT-people"

    const SERIES = {
        linear: function* linear(maxNums) {
            for (let i = 0; i < maxNums; ++i) {
                yield [i, i + 1];
            }
        },
        quadratic: function* quadratic(maxNums) {
            for (let i = 0; i < maxNums; ++i) {
                yield [i, i * i];
            }
        },
        exponential: function* exponential(maxNums) {
            for (let i = 0; i < maxNums; ++i) {
                yield [i, 1 << i];
            }
        },
    };

    class Card extends HTMLElement {
        /** @type {Number} */
        _index;
        /** @type {Number} */
        _x;
        /** @type {Number} */
        _y;
        /**
         * Width of card in pixels
         * @type {Number}
         */
        _width;
        /**
         * Height of card in pixels
         * @type {Number}
         */
        _height;
        /**
         * HTML element holding the front face of the card.
         * @type {HTMLDivElement}
         */
        _front;
        /**
         * HTML element holding the back face of the card. 
         * @type {HTMLDivElement}
         */
        _back;
        /**
         * Contents of the front face (see `_front`)
         * @type {HTMLDivElement}
         */
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
    border-radius: calc(var(--card-width) / 10);
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
    overflow: hidden;
}

.front.face > div {
    font-size: 1rem;
    overflow-wrap: anywhere;
}

.front.face > div:first-child {
    font-size: 1.3rem;
}

.back {
    transform: translateZ(-1px) rotateY(180deg);
    background-image: url(images/backface.png);
    background-repeat: repeat;
    background-size: 24px 24px;
    background-position: -4px 0;
    image-rendering: pixelated;
    cursor: pointer;
}

.face > * {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.face div {
    width: auto;
    height: 100%;
    position: relative;
    flex-grow: 0;
}

.upside-down {
    transform: rotateY(180deg);
    cursor: pointer;
}

.image {
    background-repeat: no-repeat;
    image-rendering: pixelated;
}

figure {
  display: block;
  flex-grow: 1;
  aspect-ratio: 1 / 1;
  vertical-align: bottom;
}

figure > img {
  image-rendering: pixelated;
  aspect-ratio: 1 / 1;
  vertical-align: bottom;
};
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

        /**
         * @param {MouseEvent} e 
         */
        _onClick(e) {
            const target = e.target.closest(".container");
            if (target.classList.contains("upside-down")) {
                window.dispatchEvent(new CustomEvent("cardclicked", { detail: { card: this } }));
            }
            e.stopImmediatePropagation();
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
        get index() {
            return this._index;
        }
        /**
         * @param {Number} idx
         */
        set index(idx) {
            this._index = idx;
        }
        /**
         * @returns {Number}
         */
        get x() {
            return this._x;
        }
        /**
         * @param {Number} x
         */
        set x(x) {
            this._x = x;
            this.style.left = `${x}px`;
        }
        /**
         * @returns {Number}
         */
        get y() {
            return this._y;
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
        setHTMLContent(html) {
            this._imprint.innerHTML = html;
        }
    }

    /**
      * Custom web element representing the Numemory game.
      */
    class NumemoryGame extends HTMLElement {
        static DefaultFrontVisibleDurationMs = 1000;

        /** 
         * Card width in pixels.
         * @type {Number}
         */
        _cardWidth;

        /** 
         * Card height in pixels.
         * @type {Number}
         */
        _cardHeight;

        /**
         * Minimum pixels between cards and cards to table edge.
         * @type {Number}
         */
        _cardGap = 8;

        /**
         * @type {object[]}
         */
        _cardData = [];

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
        _table;

        /**
         * `true` if cards must be clicked in reverse order.
         * @type {Boolean}
         */
        _reverseOrder = false;

        /**
         * `true` if cards are automatically flipped upside-down after wrong card was clicked.
         * @type {Boolean}
         */
        _autoHide = true;

        /**
         *  Milliseconds to wait before wrong cards will be flipped upside-down automatically 
         * @type {Number}
         */
        _autoHideMs = NumemoryGame.DefaultFrontVisibleDurationMs;

        /** 
         * Data to be displayed on the front faces of the cards.
         * @type {object[]}
         */
        _cardInfo;

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

            this._table = document.createElement("div");
            this._table.className = "table";
            this._table.setAttribute("role", "application");
            this._table.setAttribute("aria-label", "Numemory - A variant of the popular Memory game where you have to flip cards in the correct order");

            this._shadow.append(this._style, this._dynamicStyle, this._table);

            window.addEventListener("resize", this._onResize.bind(this));
            window.addEventListener("touchstart", this._onTouchStart.bind(this), { passive: false });
            window.addEventListener("touchend", this._onTouchEnd.bind(this));
            window.addEventListener("click", this._onClick.bind(this));
            window.addEventListener("cardclicked", this._onCardClicked.bind(this));
        }

        _generateCardCoords() {
            const { width, height } = this._table.getBoundingClientRect();
            if (width === 0 || height === 0)
                return;
            let card = {};
            let placedCards;

            const doesNotOverlap = card => {
                if (placedCards.length === 0)
                    return true;
                return placedCards.every(existingCard =>
                    card.x > existingCard.x + this._cardWidth + this._cardGap ||
                    card.x + this._cardWidth + this._cardGap < existingCard.x ||
                    card.y > existingCard.y + this._cardHeight + this._cardGap ||
                    card.y + this._cardHeight + this._cardGap < existingCard.y);
            };

            do {
                let restart = false;
                placedCards = [];
                for (const { name, number, img, index } of this._cardInfo) {
                    let tries = 0;
                    do {
                        if (++tries > 20) {
                            restart = true;
                            break;
                        }
                        card.x = Math.floor(this._cardGap + Math.random() * (width - this._cardWidth - 2 * this._cardGap));
                        card.y = Math.floor(this._cardGap + Math.random() * (height - this._cardHeight - 2 * this._cardGap));
                    }
                    while (!doesNotOverlap(card));
                    if (restart)
                        break;
                    const newCard = Object.assign({ index, number, img, name }, card);
                    placedCards.push(newCard);
                }
            }
            while (placedCards.length !== this._cardInfo.length);

            placedCards.forEach(card => {
                card.x /= width;
                card.y /= height;
            })
            this._cardData = placedCards;
        }

        /**
         * Adjust cards' positions and sizes to table size.
         */
        _adjustCards() {
            const { width, height } = this._table.getBoundingClientRect();
            this._cardData.forEach(cardData => {
                const { index, x, y } = cardData;
                this._cards[index].x = x * width;
                this._cards[index].y = y * height;
                this._cards[index].width = this._cardWidth;
                this._cards[index].height = this._cardHeight;
            });
        }

        /**
         * Generate `Card` objects from `_cardData` and place them on the table.
         */
        _placeCards() {
            const { width, height } = this._table.getBoundingClientRect();
            this._cards = this._cardData.map(cardData => {
                const card = document.createElement("numemory-card");
                card.index = cardData.index;
                card.x = cardData.x * width;
                card.y = cardData.y * height;
                card.width = this._cardWidth;
                card.height = this._cardHeight;
                let html = `<div>${cardData.number}</div>`;
                if (cardData.img) {
                    html += `<figure><img src="${cardData.img}" alt="${cardData.name}" width="100%" /></figure>`;
                }
                card.setHTMLContent(html);
                return card;
            });
            this._table.replaceChildren(...this._cards);
        }

        /**
         * Create cards and place them randomly on the table.
         */
        _generateCards() {
            if (!this._cardInfo || this._cardInfo.length === 0)
                return;
            this._generateCardCoords();
            this._placeCards();
        }

        _updateDynamicStyles() {
            const { width, height } = document.body.getBoundingClientRect();
            const scale = 1.2 * Math.min(width, height);
            this._cardWidth = Math.floor(scale / this._cardInfo.length);
            this._cardHeight = Math.floor(this._cardWidth * 1.5);
            this._dynamicStyle.textContent = `
:host {
    --card-width: ${this._cardWidth}px;
    --card-height: ${this._cardHeight}px;
    --font-size: ${Math.floor(this._cardWidth / 3)}px;
    --table-width: ${width}px;
    --table-height: ${height}px;
}
`;
        }

        /** @param {ResizeEvent} _e - not used */
        _onResize(_e) {
            this._updateDynamicStyles();
            this._adjustCards();
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

        _onClick(_e) {
            if (this._locked && !this._autoHide) {
                this.reset();
            }
        }

        /** @param {CustomEvent} e  */
        _onCardClicked(e) {
            const card = e.detail.card;
            if (this._locked)
                return;
            card.show();
            if (card.index !== this._cardIndex) {
                this._table.classList.add("wrong");
                this.lock();
                if (this._autoHide) {
                    setTimeout(() => {
                        ++this.round;
                        this.reset();
                    }, this._autoHideMs);
                }
            }
            else {
                if (++this._cardIndex === this._cardInfo.length) {
                    setTimeout(() => {
                        dispatchEvent(new CustomEvent("showwondialog", { detail: { rounds: this._round } }));
                    }, 250);
                }
            }
        }

        hideAllCards() {
            this._cards.forEach(card => card.hide());
        }

        showAllCards() {
            this._cards.forEach(card => card.show());
        }

        reset() {
            this.unlock();
            this._table.classList.remove("wrong");
            this._cardIndex = 0;
            this.hideAllCards();
        }

        /** Disable user interaction */
        lock() {
            this._locked = true;
        }

        /** Enable user interaction */
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
            this.reset();
            this.round = 1;
        }

        /** @returns {Boolean} `true` if cards have to be selected in reverse order */
        get reverseOrder() {
            return this._reverseOrder;
        }

        /** @param {Boolean} enabled */
        set reverseOrder(enabled) {
            this._reverseOrder = enabled;
        }

        /** @param {Boolean} enabled - `true` to turn cards automatically upside-down after wrong turn */
        set autoHide(enabled) {
            this._autoHide = enabled;
        }

        /** @returns {Boolean} `true` if cards are automatically after wrong turn */
        get autoHide() {
            return this._autoHide;
        }

        /** @returns {Number} Number of current round */
        get round() {
            return this._round;
        }

        /**
         * Set round number.
         * @param {Number} round
         */
        set round(round) {
            this._round = round;
            this.dispatchEvent(new CustomEvent("round", { detail: { round } }))
        }

        /**
         * @returns {Number} Milliseconds to wait until a shown card will be automatically flipped upside-down.
         */
        get autoHideMs() {
            return this._autoHideMs;
        }

        /**
         * @param {Number} autoHideMs - Milliseconds to wait until a shown card will be automatically flipped upside-down.
         */
        set autoHideMs(autoHideMs) {
            this._autoHideMs = autoHideMs;
        }

        /**
         * @param {object} cardInfo
        */
        set cardInfo(cardInfo) {
            this._cardInfo = cardInfo;
            this._generateCards();
        }

    }

    let el = {};

    function configSettingsDialog() {
        el.helpDialog = document.querySelector("#help-dialog");
        const okButton = el.helpDialog.querySelector('button[data-id="ok"]');
        okButton.addEventListener("click", e => {
            el.helpDialog.close();
            e.stopPropagation();
            e.preventDefault();
        });
        el.settingsDialog = document.querySelector("#settings-dialog");
        const autoHideCheckbox = el.settingsDialog.querySelector("input[name='auto-hide']");
        el.game.autoHide = localStorage.getItem("numemory-auto-hide") === "true";
        autoHideCheckbox.checked = el.game.autoHide;
        autoHideCheckbox.addEventListener("click", e => e.stopPropagation());
        const reverseOrderCheckbox = el.settingsDialog.querySelector("input[name='reverse-order']");
        el.game.reverseOrder = localStorage.getItem("numemory-reverse-order") === "true";
        reverseOrderCheckbox.checked = el.game.reverseOrder;
        reverseOrderCheckbox.addEventListener("click", e => e.stopPropagation());
        const autoHideMsInput = el.settingsDialog.querySelector("input[name='auto-hide-ms']");
        el.game.autoHideMs = parseInt(localStorage.getItem("numemory-auto-hide-ms") || NumemoryGame.DefaultFrontVisibleDurationMs);
        autoHideMsInput.value = el.game.autoHideMs
        const cancelButton = el.settingsDialog.querySelector('button[data-id="cancel"]');
        cancelButton.addEventListener("click", e => {
            el.settingsDialog.close();
            e.stopImmediatePropagation();
            e.preventDefault();
        });
        const applyButton = el.settingsDialog.querySelector('button[data-id="apply"]');
        applyButton.addEventListener("click", e => {
            const newGame = el.game.reverseOrder !== reverseOrderCheckbox.checked;
            el.game.autoHide = autoHideCheckbox.checked;
            if (el.game.autoHide) {
                el.game.hideAllCards();
                el.game.reset();
            }
            localStorage.setItem("numemory-auto-hide", el.game.autoHide);
            el.game.reverseOrder = reverseOrderCheckbox.checked;
            localStorage.setItem("numemory-reverse-order", el.game.reverseOrder);
            el.game.autoHideMs = parseInt(autoHideMsInput.value);
            localStorage.setItem("numemory-auto-hide-ms", el.game.autoHideMs);
            el.settingsDialog.close();
            if (newGame) {
                el.game.newGame();
            }
            e.stopPropagation();
            e.preventDefault();
        });
        window.addEventListener("showsettings", () => {
            autoHideCheckbox.checked = el.game.autoHide;
            reverseOrderCheckbox.checked = el.game.reverseOrder;
            autoHideMsInput.value = el.game.autoHideMs;
            el.settingsDialog.showModal();
        });
        document.querySelector("#menu-button").addEventListener("click", e => {
            dispatchEvent(new CustomEvent("showsettings"));
            e.stopImmediatePropagation();
            e.preventDefault();
        });
        window.addEventListener("showhelp", () => {
            el.helpDialog.showModal();
        });
        document.querySelector("#help-button").addEventListener("click", e => {
            dispatchEvent(new CustomEvent("showhelp"));
            e.stopImmediatePropagation();
            e.preventDefault();
        });
    }

    function configWonDialog() {
        el.wonDialog = document.querySelector("#won-dialog");
        el.wonDialog.addEventListener("close", () => {
            el.game.newGame();
        });
        const continueButton = el.wonDialog.querySelector('button[data-id="new-game"]');
        continueButton.addEventListener("click", e => {
            el.game.newGame();
            el.wonDialog.close();
            e.stopImmediatePropagation();
            e.preventDefault();
        });
        window.addEventListener("showwondialog", e => {
            el.wonDialog.querySelector("#won-rounds").textContent = e.detail.rounds;
            el.wonDialog.showModal();
        });
    }

    function main() {
        console.info("%c Numemory %c started.", "font-size: 130%; color: white; background-color:rgb(48, 98, 48); font-weight: bold", "color: initial; font-weight: normal;");
        console.info("Copyright ©️ 2025 Oliver Lau <oliver@ersatzworld.net>");

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

        configSettingsDialog();
        configWonDialog();

        fetch("data/people.json")
            .then(response => response.json())
            .then(json => {
                el.game.cardInfo = json.map((entry, index) => {
                    return Object.assign({ index }, entry);
                });
                el.game.start();
            })
            .catch(error => console.error(error));

        // let cardInfo = [...SERIES.linear(11)].map(([index, number]) => {
        //     return { index, number };
        // });
        // el.game.cardInfo = cardInfo;

        window.addEventListener("keyup", e => {
            if (e.key === "s") {
                el.game.showAllCards();
            }
            e.preventDefault();
        });

    }

    window.addEventListener("pageshow", main);
})(window);
