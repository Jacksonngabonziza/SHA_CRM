"""
SHA WhatsApp bot — 3-language lead qualification engine.
Supports English, Kinyarwanda, and Français.
"""
import re
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

# ── Message strings ───────────────────────────────────────────────────────────

MSGS = {
    'en': {
        'welcome': (
            "Hello! 👋 Welcome to *SolarHope Africa*.\n"
            "Please choose your language / Hitamo ururimi / Choisissez votre langue:\n\n"
            "*1* — English\n*2* — Kinyarwanda\n*3* — Français"
        ),
        'ask_name': (
            "Great! 😊 I'm *SHA*, your solar assistant. One of our experts will follow up with you shortly — "
            "just a few quick questions first.\n\nWhat's your name?"
        ),
        'ask_location': "Nice to meet you, *{name}*! 😊 Which district or area are you located in?",
        'ask_place_type': (
            "Got it! Is the solar system for your *home* or your *business*?\n\n"
            "*1* — Home 🏠\n*2* — Business 🏢"
        ),
        'ask_power_situation': (
            "Do you currently have electricity at your place?\n\n"
            "*1* — Yes, I have electricity (REG / RURA connected)\n"
            "*2* — No electricity at all\n"
            "*3* — I have electricity but it's very unreliable"
        ),
        'ask_solar_goal': (
            "Understood! Are you looking for solar to *work alongside* your electricity, "
            "or go *fully off-grid*?\n\n"
            "*1* — Backup only — solar kicks in when power goes off\n"
            "*2* — Full solar — stop paying electricity bills completely\n"
            "*3* — Not sure yet, I need advice"
        ),
        'ask_usage': (
            "No problem — solar is perfect for you! 🌞 What do you mainly want to power?\n\n"
            "*1* — Lights and phone charging only\n"
            "*2* — Lights, TV and a fridge\n"
            "*3* — Lights, TV, fridge and other appliances\n"
            "*4* — Full house or office — everything"
        ),
        'ask_bill': (
            "This helps us recommend the right size for you 👇\n\n"
            "How much do you spend on electricity per month approximately? "
            "_(just type the amount in RWF — your best guess is fine!)_"
        ),
        'ask_budget': (
            "Almost done! 😊 Do you have a rough budget in mind for the solar installation?\n\n"
            "*1* — Under 2 million RWF\n"
            "*2* — 2 to 5 million RWF\n"
            "*3* — Above 5 million RWF\n"
            "*4* — No idea yet — I need guidance"
        ),
        'closing': (
            "Thank you, *{name}*! ✅\n\n"
            "You're all set. One of our solar experts will reach out to you on this WhatsApp "
            "within *2 hours* to give you a free personalised recommendation and quote.\n\n"
            "If it's after hours, expect a message first thing tomorrow morning! 🌞\n\n"
            "_SolarHope Africa — Light Up Dreams, The Solar Way_"
        ),
        'invalid': "I didn't quite get that 😊 Please reply with the *number* that matches your choice:",
        'fallback': "Thanks for your message! 😊 Our team will be with you shortly.",
        'media_ack': (
            "Thanks for sharing! 😊 Our team will review it when they follow up. "
            "Let me finish a couple of quick questions first..."
        ),
    },
    'rw': {
        'welcome': (
            "Muraho! 👋 Murakaza neza kuri *SolarHope Africa*.\n"
            "Please choose your language / Hitamo ururimi / Choisissez votre langue:\n\n"
            "*1* — English\n*2* — Kinyarwanda\n*3* — Français"
        ),
        'ask_name': (
            "Neza! 😊 Nitwa *SHA*, umufasha wawe wa solar. "
            "Nzaguhuza n'itsinda ryacu vuba — ibibazo bike gusa mbere.\n\nUwitwa nde?"
        ),
        'ask_location': "Ni byiza kukumenya, *{name}*! 😊 Uri ahe? (Akarere / Umujyi)",
        'ask_place_type': (
            "Byumvikane! Solar ni ya *nyumba* cyangwa ya *bikorwa*?\n\n"
            "*1* — Inzu 🏠\n*2* — Bikorwa 🏢"
        ),
        'ask_power_situation': (
            "Mufite amashanyarazi muri iki gihe?\n\n"
            "*1* — Yego, mufite amashanyarazi (REG / RURA)\n"
            "*2* — Oya, nta mashanyarazi dufite\n"
            "*3* — Mufite ariko ntabwo akora neza"
        ),
        'ask_solar_goal': (
            "Nibyo! Murashaka solar gukorana n'amashanyarazi, cyangwa gukoresha solar gusa?\n\n"
            "*1* — Backup gusa — iyo amashanyarazi ahagarara\n"
            "*2* — Solar yose — nta mashanyarazi yo kugura\n"
            "*3* — Ntabwo mzi, nkeneye inama"
        ),
        'ask_usage': (
            "Nta kibazo — solar ni iy'ingirakamaro cyane! 🌞 Murashaka gutera inkunga iki cyane?\n\n"
            "*1* — Amadora n'ibyuma byo gutoza telephone\n"
            "*2* — Amadora, televiziyo n'firigo\n"
            "*3* — Amadora, televiziyo, firigo n'ibindi\n"
            "*4* — Inzu yose cyangwa bureau — byose"
        ),
        'ask_bill': (
            "Ibi bizatworohera gusuganya ibigenerwa 👇\n\n"
            "Mugura amashanyarazi angahe mu kwezi? "
            "_(andika amafaranga mu RWF — agereranya ni byiza!)_"
        ),
        'ask_budget': (
            "Hafi turi kumwe! 😊 Mufite ingengo y'imari mu mutwe ku isimba rya solar?\n\n"
            "*1* — Munsi ya miliyoni 2 RWF\n"
            "*2* — Miliyoni 2 kugeza 5 RWF\n"
            "*3* — Hejuru ya miliyoni 5 RWF\n"
            "*4* — Ntabwo mzi — nkeneye ubuyobozi"
        ),
        'closing': (
            "Murakoze, *{name}*! ✅\n\n"
            "Murateguye. Umwe mu nzobere zacu za solar azabatumanahira kuri ino WhatsApp "
            "mu masaha *2* azabahe inama y'ubuntu n'igiciro.\n\n"
            "Niba ari nijoro, tegereza ubutumwa bwa kare ejo! 🌞\n\n"
            "_SolarHope Africa — Tuze Inzozi, Inzira ya Solar_"
        ),
        'invalid': "Sinumvise neza 😊 Subiza *umubare* ukwiye:",
        'fallback': "Murakoze ubutumwa bwanyu! 😊 Itsinda ryacu rizaza vuba.",
        'media_ack': (
            "Murakoze kubigeza! 😊 Itsinda ryacu rizabibona igihe bazabatumanahira. "
            "Nibasubize ibibazo bike mbere..."
        ),
    },
    'fr': {
        'welcome': (
            "Bonjour! 👋 Bienvenue chez *SolarHope Africa*.\n"
            "Please choose your language / Hitamo ururimi / Choisissez votre langue:\n\n"
            "*1* — English\n*2* — Kinyarwanda\n*3* — Français"
        ),
        'ask_name': (
            "Super! 😊 Je suis *SHA*, votre assistant solaire. "
            "Je vais vous mettre en contact avec notre équipe rapidement — juste quelques questions d'abord.\n\n"
            "Comment vous appelez-vous?"
        ),
        'ask_location': "Ravi de vous connaître, *{name}*! 😊 Dans quel district ou quelle zone vous trouvez-vous?",
        'ask_place_type': (
            "Compris! Le système solaire est pour votre *maison* ou votre *entreprise*?\n\n"
            "*1* — Maison 🏠\n*2* — Entreprise 🏢"
        ),
        'ask_power_situation': (
            "Avez-vous actuellement de l'électricité chez vous?\n\n"
            "*1* — Oui, j'ai l'électricité (REG / RURA)\n"
            "*2* — Non, je n'ai pas d'électricité du tout\n"
            "*3* — J'ai l'électricité mais elle est très instable"
        ),
        'ask_solar_goal': (
            "Je comprends! Vous cherchez le solaire pour *compléter* votre électricité, "
            "ou passer entièrement *hors réseau*?\n\n"
            "*1* — Backup seulement — quand le courant coupe\n"
            "*2* — Solaire complet — arrêter de payer les factures\n"
            "*3* — Pas encore sûr, j'ai besoin de conseils"
        ),
        'ask_usage': (
            "Pas de problème — le solaire est parfait pour vous! 🌞 "
            "Qu'est-ce que vous voulez principalement alimenter?\n\n"
            "*1* — Lumières et chargement de téléphone seulement\n"
            "*2* — Lumières, TV et réfrigérateur\n"
            "*3* — Lumières, TV, frigo et autres appareils\n"
            "*4* — Maison ou bureau complet — tout"
        ),
        'ask_bill': (
            "Cela nous aide à recommander la bonne taille pour vous 👇\n\n"
            "Combien dépensez-vous en électricité par mois environ? "
            "_(tapez le montant en RWF — une estimation suffit!)_"
        ),
        'ask_budget': (
            "Presque terminé! 😊 Avez-vous un budget approximatif en tête?\n\n"
            "*1* — Moins de 2 millions RWF\n"
            "*2* — 2 à 5 millions RWF\n"
            "*3* — Plus de 5 millions RWF\n"
            "*4* — Aucune idée — j'ai besoin de conseils"
        ),
        'closing': (
            "Merci, *{name}*! ✅\n\n"
            "C'est tout! Un de nos experts solaires vous contactera sur ce WhatsApp "
            "dans *2 heures* pour une recommandation et un devis gratuits et personnalisés.\n\n"
            "Si c'est en dehors des heures, attendez un message tôt demain matin! 🌞\n\n"
            "_SolarHope Africa — Réaliser les Rêves, La Voie Solaire_"
        ),
        'invalid': "Je n'ai pas bien compris 😊 Répondez avec le *numéro* qui correspond:",
        'fallback': "Merci pour votre message! 😊 Notre équipe sera avec vous très bientôt.",
        'media_ack': (
            "Merci pour le partage! 😊 Notre équipe l'examinera lors du suivi. "
            "Laissez-moi d'abord poser quelques questions rapides..."
        ),
    },
}

REG_TARIFF_RWF_KWH = 205  # approximate Rwanda grid tariff


def _m(lang: str, key: str) -> str:
    return MSGS.get(lang, MSGS['en']).get(key, MSGS['en'].get(key, ''))


def _parse_choice(text: str, valid: set) -> str | None:
    """Normalise a reply to a digit string and check it's in valid set."""
    cleaned = text.strip().lstrip('*').rstrip('*').strip('.')
    return cleaned if cleaned in valid else None


def _parse_number(text: str) -> int | None:
    nums = re.findall(r'[\d,]+', text)
    if not nums:
        return None
    try:
        return int(nums[0].replace(',', ''))
    except ValueError:
        return None


# ── Main handler ─────────────────────────────────────────────────────────────

def process_inbound(conv, body: str, msg_type: str = 'text') -> None:
    """
    Advance the bot state machine for a single inbound message.
    conv is a WAConversation instance (already saved).
    Mutates and saves conv at the end.
    """
    from apps.whatsapp.services import send_bot_message, create_client_from_conv

    if conv.status in (conv.STATUS_HUMAN, conv.STATUS_TRANSFERRED, conv.STATUS_RESOLVED):
        return

    step = conv.bot_step
    lang = conv.language
    is_text = msg_type == 'text'

    # ── Step 0: first message → welcome ─────────────────────────────────────
    if step == 0:
        send_bot_message(conv, _m(lang, 'welcome'))
        conv.bot_step = 1
        conv.save()
        return

    # ── Non-text media during bot flow ───────────────────────────────────────
    if not is_text and step in (1, 4, 5, 6, 7, 8):
        send_bot_message(conv, _m(lang, 'media_ack'))
        _resend_current_question(conv, lang, step)
        return

    # ── Step 1: language selection ───────────────────────────────────────────
    if step == 1:
        choice = _parse_choice(body, {'1', '2', '3'})
        if choice == '1':
            conv.language = lang = 'en'
        elif choice == '2':
            conv.language = lang = 'rw'
        elif choice == '3':
            conv.language = lang = 'fr'
        else:
            send_bot_message(conv, _m(lang, 'welcome'))
            conv.save()
            return
        send_bot_message(conv, _m(lang, 'ask_name'))
        conv.bot_step = 2
        conv.save()
        return

    # ── Step 2: name ─────────────────────────────────────────────────────────
    if step == 2:
        name = body.strip().title()[:100]
        if not name:
            send_bot_message(conv, _m(lang, 'ask_name'))
            conv.save()
            return
        conv.bot_data = {**conv.bot_data, 'name': name}
        conv.display_name = name
        send_bot_message(conv, _m(lang, 'ask_location').format(name=name))
        conv.bot_step = 3
        conv.save()
        return

    # ── Step 3: location ─────────────────────────────────────────────────────
    if step == 3:
        loc = body.strip()[:200]
        if not loc:
            send_bot_message(conv, _m(lang, 'ask_location').format(name=conv.bot_data.get('name', '')))
            conv.save()
            return
        conv.bot_data = {**conv.bot_data, 'location': loc}
        send_bot_message(conv, _m(lang, 'ask_place_type'))
        conv.bot_step = 4
        conv.save()
        return

    # ── Step 4: place type ───────────────────────────────────────────────────
    if step == 4:
        choice = _parse_choice(body, {'1', '2'})
        if not choice:
            send_bot_message(conv, _m(lang, 'invalid'))
            send_bot_message(conv, _m(lang, 'ask_place_type'))
            conv.save()
            return
        conv.bot_data = {**conv.bot_data, 'place_type': 'home' if choice == '1' else 'business'}
        send_bot_message(conv, _m(lang, 'ask_power_situation'))
        conv.bot_step = 5
        conv.save()
        return

    # ── Step 5: power situation ──────────────────────────────────────────────
    if step == 5:
        choice = _parse_choice(body, {'1', '2', '3'})
        if not choice:
            send_bot_message(conv, _m(lang, 'invalid'))
            send_bot_message(conv, _m(lang, 'ask_power_situation'))
            conv.save()
            return
        has_power = choice in ('1', '3')
        situation_map = {'1': 'has_power', '2': 'no_power', '3': 'unreliable'}
        conv.bot_data = {**conv.bot_data, 'power_situation': situation_map[choice], 'has_power': has_power}
        if has_power:
            send_bot_message(conv, _m(lang, 'ask_solar_goal'))
        else:
            send_bot_message(conv, _m(lang, 'ask_usage'))
        conv.bot_step = 6
        conv.save()
        return

    # ── Step 6: solar goal (if power) or usage (if off-grid) ─────────────────
    if step == 6:
        has_power = conv.bot_data.get('has_power', True)
        if has_power:
            choice = _parse_choice(body, {'1', '2', '3'})
            if not choice:
                send_bot_message(conv, _m(lang, 'invalid'))
                send_bot_message(conv, _m(lang, 'ask_solar_goal'))
                conv.save()
                return
            goal_map = {'1': 'backup', '2': 'off_grid', '3': 'unsure'}
            conv.bot_data = {**conv.bot_data, 'solar_goal': goal_map[choice]}
            send_bot_message(conv, _m(lang, 'ask_bill'))
            conv.bot_step = 7
        else:
            choice = _parse_choice(body, {'1', '2', '3', '4'})
            if not choice:
                send_bot_message(conv, _m(lang, 'invalid'))
                send_bot_message(conv, _m(lang, 'ask_usage'))
                conv.save()
                return
            usage_map = {
                '1': 'lights_charging', '2': 'lights_tv_fridge',
                '3': 'lights_tv_fridge_appliances', '4': 'full_house',
            }
            conv.bot_data = {**conv.bot_data, 'usage': usage_map[choice]}
            send_bot_message(conv, _m(lang, 'ask_budget'))
            conv.bot_step = 8
        conv.save()
        return

    # ── Step 7: electricity bill (only when has power) ────────────────────────
    if step == 7:
        amount = _parse_number(body)
        if amount and amount > 0:
            daily_kwh = round(amount / REG_TARIFF_RWF_KWH / 30, 2)
            conv.bot_data = {**conv.bot_data, 'bill_rwf': amount, 'estimated_daily_kwh': daily_kwh}
        send_bot_message(conv, _m(lang, 'ask_budget'))
        conv.bot_step = 8
        conv.save()
        return

    # ── Step 8: budget ───────────────────────────────────────────────────────
    if step == 8:
        choice = _parse_choice(body, {'1', '2', '3', '4'})
        if not choice:
            send_bot_message(conv, _m(lang, 'invalid'))
            send_bot_message(conv, _m(lang, 'ask_budget'))
            conv.save()
            return
        budget_map = {'1': 'under_2m', '2': '2_5m', '3': 'above_5m', '4': 'no_idea'}
        conv.bot_data = {**conv.bot_data, 'budget': budget_map[choice]}
        # Create CRM client record
        try:
            create_client_from_conv(conv)
        except Exception:
            logger.exception("Failed to auto-create client from WhatsApp lead wa_id=%s", conv.wa_id)
        name = conv.bot_data.get('name', 'there')
        send_bot_message(conv, _m(lang, 'closing').format(name=name))
        conv.bot_step = 9
        conv.status = conv.STATUS_HUMAN
        conv.save()
        return


def _resend_current_question(conv, lang: str, step: int) -> None:
    """Re-ask the current step's question after a non-text media message."""
    from apps.whatsapp.services import send_bot_message

    question_map = {
        1: lambda: send_bot_message(conv, _m(lang, 'welcome')),
        2: lambda: send_bot_message(conv, _m(lang, 'ask_name')),
        3: lambda: send_bot_message(conv, _m(lang, 'ask_location').format(name=conv.bot_data.get('name', ''))),
        4: lambda: send_bot_message(conv, _m(lang, 'ask_place_type')),
        5: lambda: send_bot_message(conv, _m(lang, 'ask_power_situation')),
        6: lambda: send_bot_message(conv, _m(lang, 'ask_solar_goal' if conv.bot_data.get('has_power') else 'ask_usage')),
        7: lambda: send_bot_message(conv, _m(lang, 'ask_bill')),
        8: lambda: send_bot_message(conv, _m(lang, 'ask_budget')),
    }
    fn = question_map.get(step)
    if fn:
        fn()
