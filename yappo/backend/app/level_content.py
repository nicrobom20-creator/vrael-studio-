"""Level tracks for English. Beginner, intermediate, and advanced do not share the same lines."""


def _v(word, translation, example, example_ru):
    return {"type": "vocab", "word": word, "reading": "", "translation": translation, "example": example, "example_ru": example_ru, "tts": word, "band": "mid"}


def _c(prompt, options, answer, explain):
    return {"type": "choice", "prompt": prompt, "sub": "Выбери живой вариант", "options": list(options), "answer": answer, "explain": explain}


def _b(ru, answer, extra):
    return {"type": "build", "prompt": "Собери фразу", "ru": ru, "answer": list(answer), "extra": list(extra)}


def _s(phrase, translation, hint):
    return {"type": "speak", "prompt": "Скажи вслух", "phrase": phrase, "translation": translation, "tts": phrase, "hint": hint}


def _d(phrase, translation):
    return {"type": "dictate", "prompt": "Напиши, что слышишь", "phrase": phrase, "translation": translation, "tts": phrase}


def _t(prompt, beats):
    return {"type": "talk", "prompt": prompt, "beats": beats}


def _talk(text, note, best=False):
    return {"text": text, "note": note, "best": best}


EXTRA = {
    "en-1-vocab": {
        "mid": [
            _v("Could I have the bill?", "Можно счёт?", "Could I have the bill, please?", "Можно счёт, пожалуйста?"),
            _v("Is this seat taken?", "Это место занято?", "Is this seat taken?", "Это место занято?"),
            _v("I'll have the same.", "Мне то же самое.", "I'll have the same, please.", "Мне то же самое, пожалуйста."),
            _v("Keep the change.", "Сдачи не надо.", "Keep the change.", "Сдачи не надо."),
            _c("Как вежливо попросить счёт?", ["Could I have the bill?", "Give me money.", "I am a tea.", "Where is hello?"], 0, "Could I have the bill? — можно счёт?"),
            _d("Is this seat taken?", "Это место занято?"),
        ],
        "advanced": [
            _v("I'm easy either way.", "Мне всё равно, как удобнее.", "Tea or coffee? I'm easy either way.", "Чай или кофе? Мне всё равно."),
            _v("That hits the spot.", "Вот это то, что нужно.", "This tea hits the spot.", "Этот чай — то, что нужно."),
            _v("Could you say that another way?", "Можете сказать иначе?", "Could you say that another way?", "Можете сказать иначе?"),
            _v("I don't want to hold you up.", "Не хочу вас задерживать.", "I don't want to hold you up.", "Не хочу вас задерживать."),
            _t("The barista asks what you'd like.", [
                _talk("I'm easy either way — surprise me.", "Бариста улыбается и предлагает фирменный чай.", True),
                _talk("Give tea now.", "Фраза резкая. Он переспрашивает холоднее.", False),
            ]),
            _s("Could you say that another way?", "Можете сказать иначе?", "Another way — «другими словами»."),
        ],
    },
    "en-1-choice": {
        "mid": [
            _c("Как сказать «мне то же самое»?", ["I'll have the same.", "I am the same person.", "Give me same food now.", "Hello the same."], 0, "I'll have the same — мне то же самое."),
            _c("Место занято?", ["Is this seat taken?", "Is this tea taken?", "Where is the seat from?", "Keep the seat."], 0, "Is this seat taken?"),
            _c("Сдачи не надо.", ["Keep the change.", "Keep the tea.", "Change the seat.", "I don't change."], 0, "Keep the change."),
            _d("I'll have the same, please.", "Мне то же самое, пожалуйста."),
        ],
        "advanced": [
            _c("Что ближе к «мне всё равно»?", ["I'm easy either way.", "I am easy person.", "Either tea is closed.", "Way is the station."], 0, "I'm easy either way — мне всё равно, оба варианта ок."),
            _c("«Вот это то, что нужно».", ["That hits the spot.", "That hits the station.", "The spot is closed.", "Hit the bill."], 0, "That hits the spot — идиома, не про удар."),
            _t("You don't understand the barista.", [
                _talk("Could you say that another way?", "Он повторяет медленнее и проще.", True),
                _talk("You speak bad.", "Разговор обрывается. Так не говорят.", False),
            ]),
        ],
    },
    "en-1-build": {
        "mid": [
            _b("Можно счёт, пожалуйста?", ["Could I have", "the bill,", "please?"], ["the seat", "hello"]),
            _b("Это место занято?", ["Is this seat", "taken?"], ["the bill", "change"]),
            _b("Мне то же самое.", ["I'll have", "the same."], ["keep", "hello"]),
        ],
        "advanced": [
            _b("Мне всё равно, как удобнее.", ["I'm easy", "either way."], ["the bill", "station"]),
            _b("Можете сказать иначе?", ["Could you say", "that another", "way?"], ["hits", "spot"]),
            _b("Не хочу вас задерживать.", ["I don't want", "to hold you", "up."], ["the tea", "please"]),
        ],
    },
    "en-1-listen": {
        "mid": [
            {"type": "listen", "prompt": "Что ты слышишь?", "tts": "Could I have the bill, please?", "options": ["Можно счёт?", "Можно место?", "Где вокзал?", "Сдачи не надо"], "answer": 0, "explain": "Could I have the bill — можно счёт?"},
            {"type": "listen", "prompt": "Что ты слышишь?", "tts": "Is this seat taken?", "options": ["Это место занято?", "Это чай?", "Где счёт?", "Мне то же"], "answer": 0, "explain": "Is this seat taken?"},
            _d("Keep the change.", "Сдачи не надо."),
        ],
        "advanced": [
            {"type": "listen", "prompt": "Что ты слышишь?", "tts": "That hits the spot.", "options": ["Вот это то, что нужно", "Это место занято", "Можно счёт", "Где фонтан"], "answer": 0, "explain": "That hits the spot — идиома."},
            {"type": "listen", "prompt": "Что ты слышишь?", "tts": "I'm easy either way.", "options": ["Мне всё равно", "Я лёгкий человек", "Чай закрыт", "Держи сдачу"], "answer": 0, "explain": "I'm easy either way — оба варианта подходят."},
            _s("That hits the spot.", "Вот это то, что нужно.", "Spot здесь не «пятно», а «самое то»."),
        ],
    },
    "en-1-speak": {
        "mid": [
            _s("Could I have the bill, please?", "Можно счёт?", "Bill — счёт, не купюра в этом разговоре."),
            _s("Is this seat taken?", "Это место занято?", "Taken — занято."),
            _s("I'll have the same.", "Мне то же самое.", "The same — то же самое."),
        ],
        "advanced": [
            _s("I'm easy either way.", "Мне всё равно.", "Either way — как угодно."),
            _s("Could you say that another way?", "Скажите иначе?", "Another way — другими словами."),
            _s("I don't want to hold you up.", "Не хочу задерживать.", "Hold you up — задерживать человека."),
        ],
    },
    "en-2-vocab": {
        "mid": [
            _v("Do you take cards?", "Вы принимаете карты?", "Do you take cards?", "Вы принимаете карты?"),
            _v("I'm just looking.", "Я просто смотрю.", "I'm just looking, thanks.", "Я просто смотрю, спасибо."),
            _v("Have you got this in a smaller size?", "Есть размер меньше?", "Have you got this in a smaller size?", "Есть поменьше?"),
            _c("Как сказать «я просто смотрю»?", ["I'm just looking.", "I am a map.", "Look the ticket.", "Smaller hello."], 0, "I'm just looking — я просто смотрю, без покупки."),
        ],
        "advanced": [
            _v("That's a bit steep.", "Дороговато.", "That's a bit steep for a scarf.", "Для шарфа дороговато."),
            _v("Can you do any better on the price?", "Можно дешевле?", "Can you do any better on the price?", "Можно уступить?"),
            _v("I'll take it.", "Беру.", "I'll take it.", "Беру."),
            _t("The price feels high.", [
                _talk("That's a bit steep. Can you do any better?", "Продавец предлагает небольшую скидку.", True),
                _talk("Too money. Bad shop.", "Разговор закрывается.", False),
            ]),
        ],
    },
    "en-2-choice": {
        "mid": [
            _c("«Вы принимаете карты?»", ["Do you take cards?", "Do you take bread?", "Where is the card from?", "I'm just a card."], 0, "Do you take cards?"),
            _c("«Я просто смотрю».", ["I'm just looking.", "I look the map.", "Just give me bread.", "Looking is the station."], 0, "I'm just looking."),
            _d("Do you take cards?", "Вы принимаете карты?"),
        ],
        "advanced": [
            _c("«Дороговато».", ["That's a bit steep.", "That's a bit street.", "Steep is the station.", "A bit of bread."], 0, "Steep здесь — «кусается цена»."),
            _c("«Беру».", ["I'll take it.", "I take the station.", "Take me later.", "It is steep."], 0, "I'll take it — беру."),
            _s("Can you do any better on the price?", "Можно уступить?", "Do any better — сделать цену приятнее."),
        ],
    },
    "en-3-choice": {
        "mid": [
            _c("Как мягко не понять?", ["Sorry, I didn't quite catch that.", "I don't English.", "Repeat food.", "You are wrong."], 0, "I didn't quite catch that — я не совсем расслышал."),
            _c("«Давайте на связи».", ["Let's stay in touch.", "Touch the station.", "Stay the tea.", "In touch of bread."], 0, "Let's stay in touch."),
            _d("Sorry, I didn't quite catch that.", "Простите, я не совсем расслышал."),
        ],
        "advanced": [
            _c("Как сказать «я вас понял не до конца»?", ["I'm not quite with you.", "I am not quite a person.", "With you is the bill.", "Quite the station."], 0, "I'm not quite with you — мысль не дошла."),
            _c("«Это меня выручило».", ["That was a lifesaver.", "That was a life station.", "Saver the tea.", "Life is the fountain."], 0, "A lifesaver — очень выручило."),
            _t("A stranger helps you with the way.", [
                _talk("That was a lifesaver. Thanks so much.", "Человек рад и прощается тепло.", True),
                _talk("Ok go.", "Помощь обрывается. Звучит пусто.", False),
            ]),
        ],
    },
    "en-4-vocab": {
        "mid": [
            _v("It's grown on me.", "Мне стало нравиться.", "Rome has grown on me.", "Рим мне стал нравиться."),
            _v("I could get used to this.", "Я бы к этому привык.", "I could get used to this view.", "Я бы привык к такому виду."),
            _c("«Мне стало нравиться».", ["It's grown on me.", "It grew the station.", "Grown is bread.", "On me is the bill."], 0, "It's grown on me — не про рост растения."),
        ],
        "advanced": [
            _v("It's a bit of a hidden gem.", "Это тихая находка.", "This square is a hidden gem.", "Эта площадь — тихая находка."),
            _v("I wouldn't miss it for the world.", "Ни за что не пропустил бы.", "I wouldn't miss it for the world.", "Ни за что бы не пропустил."),
            _s("It's a bit of a hidden gem.", "Тихая находка.", "Hidden gem — место, которое не все знают."),
            _t("A local asks if you like the square.", [
                _talk("It's a hidden gem. I could get used to this.", "Он советует ещё одну тихую улицу.", True),
                _talk("Square bad.", "Разговор заканчивается сразу.", False),
            ]),
        ],
    },
}
