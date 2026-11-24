"""A difficulty ladder for every language. Later ranks are longer, real phrases."""


def _p(say: str, ru: str, *parts: str, reading: str = "", hint: str = "") -> dict:
    if not parts:
        bits = say.split()
        if len(bits) < 2:
            parts = (say, ".")
        else:
            mid = max(1, len(bits) // 2)
            parts = (" ".join(bits[:mid]), " ".join(bits[mid:]))
    return {"say": say, "ru": ru, "parts": list(parts), "reading": reading, "hint": hint}


def _grow(base: list[dict]) -> list[dict]:
    out = list(base)
    index = 0
    while len(out) < 36:
        left = base[(index + 5) % len(base)]
        right = base[(index + 8) % len(base)]
        out.append({
            "say": f"{left['say'].rstrip('.!?')} — {right['say']}",
            "ru": f"{left['ru']}; {right['ru']}",
            "parts": [left["say"], right["say"]],
            "reading": " ".join(bit for bit in (left["reading"], right["reading"]) if bit),
            "hint": right["hint"] or left["hint"],
        })
        index += 1
    return out


_EN = [
    _p("Hello", "Здравствуйте", hint="Короткое приветствие."),
    _p("Thank you", "Спасибо"),
    _p("A coffee, please", "кофе", "A coffee,", "please"),
    _p("A tea, please", "чай, пожалуйста", "A tea,", "please"),
    _p("Where is the station?", "Где вокзал?", "Where is", "the station?"),
    _p("That was a lifesaver", "ты меня выручил", "That was", "a lifesaver", hint="Lifesaver — очень выручило, не про спасателя."),
    _p("I'm not quite with you", "я не до конца понял", "I'm not quite", "with you"),
    _p("Could I have the bill?", "можно счёт?", "Could I have", "the bill?"),
    _p("I'm easy either way", "мне всё равно", "I'm easy", "either way", hint="Either way — как тебе удобнее."),
    _p("That hits the spot", "вот это то, что нужно", "That hits", "the spot"),
    _p("That's a bit steep", "дороговато", "That's a bit", "steep"),
    _p("I could get used to this", "я бы к этому привык", "I could get", "used to this"),
    _p("I wouldn't miss it for the world", "ни за что не пропустил бы", "I wouldn't miss it", "for the world"),
    _p("Could you say that another way?", "скажи иначе", "Could you say that", "another way?"),
]

_FR = [
    _p("Bonjour", "Здравствуйте"),
    _p("Merci", "Спасибо"),
    _p("Un café, s'il vous plaît", "кофе", "Un café,", "s'il vous plaît"),
    _p("L'addition, s'il vous plaît", "счёт, пожалуйста", "L'addition,", "s'il vous plaît"),
    _p("Où est le métro ?", "Где метро?", "Où est", "le métro ?"),
    _p("Tu m'as sauvé la mise", "ты меня выручил", "Tu m'as", "sauvé la mise"),
    _p("Je ne vous suis pas", "я не до конца понял", "Je ne vous", "suis pas"),
    _p("Je voudrais la même chose", "мне то же самое", "Je voudrais", "la même chose"),
    _p("Ça m'est égal", "мне всё равно", "Ça m'est", "égal"),
    _p("C'est un peu trop cher", "дороговато", "C'est un peu", "trop cher"),
    _p("Je pourrais m'y habituer", "я бы к этому привык", "Je pourrais", "m'y habituer"),
    _p("Je ne manquerais ça pour rien au monde", "ни за что не пропустил бы", "Je ne manquerais ça", "pour rien au monde"),
    _p("Vous pouvez le dire autrement ?", "скажи иначе", "Vous pouvez", "le dire autrement ?"),
    _p("Je regarde, merci", "я просто смотрю", "Je regarde,", "merci"),
]

_ES = [
    _p("Hola", "Здравствуйте"),
    _p("Gracias", "Спасибо"),
    _p("Un café, por favor", "кофе", "Un café,", "por favor"),
    _p("La cuenta, por favor", "счёт, пожалуйста", "La cuenta,", "por favor"),
    _p("¿Dónde está el metro?", "Где метро?", "¿Dónde está", "el metro?"),
    _p("Me salvaste", "ты меня выручил", "Me", "salvaste"),
    _p("No te sigo del todo", "я не до конца понял", "No te sigo", "del todo"),
    _p("Para mí lo mismo", "мне то же самое", "Para mí", "lo mismo"),
    _p("Me da igual", "мне всё равно", "Me da", "igual"),
    _p("Está un poco caro", "дороговато", "Está un poco", "caro"),
    _p("Me podría acostumbrar", "я бы к этому привык", "Me podría", "acostumbrar"),
    _p("No me lo perdería por nada", "ни за что не пропустил бы", "No me lo perdería", "por nada"),
    _p("¿Puedes decirlo de otra forma?", "скажи иначе", "¿Puedes decirlo", "de otra forma?"),
    _p("Solo estoy mirando", "я просто смотрю", "Solo estoy", "mirando"),
]

_DE = [
    _p("Hallo", "Здравствуйте"),
    _p("Danke", "Спасибо"),
    _p("Einen Kaffee, bitte", "кофе", "Einen Kaffee,", "bitte"),
    _p("Die Rechnung, bitte", "счёт, пожалуйста", "Die Rechnung,", "bitte"),
    _p("Wo ist der Bahnhof?", "Где вокзал?", "Wo ist", "der Bahnhof?"),
    _p("Du hast mich gerettet", "ты меня выручил", "Du hast mich", "gerettet"),
    _p("Da komme ich nicht ganz mit", "я не до конца понял", "Da komme ich", "nicht ganz mit"),
    _p("Für mich dasselbe", "мне то же самое", "Für mich", "dasselbe"),
    _p("Das ist mir egal", "мне всё равно", "Das ist mir", "egal"),
    _p("Das ist etwas happig", "дороговато", "Das ist", "etwas happig"),
    _p("Daran könnte ich mich gewöhnen", "я бы к этому привык", "Daran könnte ich", "mich gewöhnen"),
    _p("Das würde ich um nichts verpassen", "ни за что не пропустил бы", "Das würde ich", "um nichts verpassen"),
    _p("Kannst du das anders sagen?", "скажи иначе", "Kannst du das", "anders sagen?"),
    _p("Ich schaue nur", "я просто смотрю", "Ich schaue", "nur"),
]

_ZH = [
    _p("你好", "Здравствуйте", "你", "好", reading="nǐ hǎo"),
    _p("谢谢", "Спасибо", "谢", "谢", reading="xièxie"),
    _p("咖啡", "кофе", "咖", "啡", reading="kāfēi"),
    _p("请给我茶", "чай, пожалуйста", "请给我", "茶", reading="qǐng gěi wǒ chá"),
    _p("地铁在哪儿", "Где метро?", "地铁", "在哪儿", reading="dìtiě zài nǎr"),
    _p("你帮了大忙", "ты меня выручил", "你帮了", "大忙", reading="nǐ bāng le dà máng"),
    _p("我没太听懂", "я не до конца понял", "我没太", "听懂", reading="wǒ méi tài tīng dǒng"),
    _p("我也一样", "мне то же самое", "我也", "一样", reading="wǒ yě yíyàng"),
    _p("随便", "мне всё равно", "随", "便", reading="suíbiàn", hint="«Как вам удобно», не «я лёгкий»."),
    _p("有点贵", "дороговато", "有点", "贵", reading="yǒudiǎn guì"),
    _p("我能习惯这样", "я бы к этому привык", "我能习惯", "这样", reading="wǒ néng xíguàn zhèyàng"),
    _p("我说什么也不错过", "ни за что не пропустил бы", "我说什么", "也不错过", reading="wǒ shuō shénme yě bù cuòguò"),
    _p("你能换个说法吗", "скажи иначе", "你能换个", "说法吗", reading="nǐ néng huàn ge shuōfǎ ma"),
    _p("我只是看看", "я просто смотрю", "我只是", "看看", reading="wǒ zhǐshì kànkan"),
]

BANK = {
    "en": _grow(_EN),
    "fr": _grow(_FR),
    "es": _grow(_ES),
    "de": _grow(_DE),
    "zh": _grow(_ZH),
}

NPC = {"en": "Оливер", "fr": "Камиль", "es": "Лусия", "de": "Лена", "zh": "Сяомэй"}


def window(language: str, rank: int) -> list[dict]:
    bank = BANK.get(language) or BANK["en"]
    start = max(0, min(len(bank) - 4, int(rank)))
    return bank[start:start + 4]
