
(function () {

  // ---- CONFIG ----
  const SUPPORT_EMAIL = "M.I.M.Vosteen@hhs.nl"; 
  const SIMILARITY_THRESHOLD = 0.18;
  const EXACT_MATCH_THRESHOLD = 0.55;
  const PRIMARY_COLOR = "#1a3a52";
  const TYPING_DELAY_MIN = 700;
  const TYPING_DELAY_MAX = 1800;

  const FAQ_JSON_URL = (function () {
    const thisScript = document.currentScript;
    if (thisScript && thisScript.src) {
      return thisScript.src.replace(/faq-widget\.js(\?.*)?$/, "faq.json");
    }
    return "faq.json";
  })();

  const GREETINGS = ["hi","hello","hallo","hoi","hey","hee","goedemorgen","goedemiddag","goedenavond","dag","yo"];
  const GREETING_REPLY = "Hallo! 👋 Leuk dat je er bent. Stel gerust je vraag over de opleiding Data Science & AI.";

  // ---- SYNONIEMEN ----
  // Elke regel: een groep woorden die hetzelfde betekenen.
  const SYNONYM_GROUPS = [
    ["kosten", "prijs", "tarief", "betalen", "geld"],
    ["studie", "opleiding", "programma", "studierichting"],
    ["duur", "lengte", "tijdsduur"],
    ["jaar", "jaren", "studiejaar", "studiejaren"],
    ["python", "programmeertaal"],
    ["stage", "stageplek", "stagelopen", "internship"],
    ["bedrijf", "organisatie", "company", "opdrachtgever"],
    ["project", "projecten", "opdracht", "opdrachten", "casus", "casussen"],
    ["data", "dataset", "datasets", "gegevens"],
    ["ai", "kunstmatige intelligentie", "artificial intelligence"],
    ["machine learning", "ml"],
    ["deep learning", "dl", "neurale netwerken", "neural networks", "neural network"],
    ["software", "programma", "tool", "tools"],
    ["diploma", "certificaat", "certificaten", "diplomas", "afstuderen"],
    ["voltijd", "fulltime", "full time"],
    ["deeltijd", "parttime", "part time"],
    ["voorkennis", "kennis", "ervaring"],
    ["studenten", "student", "leerlingen", "leerling"],
    ["begeleiding", "begeleiden", "ondersteuning"],
    ["privacy", "vertrouwelijk", "veilig", "veiligheid", "gevoelig"],
    ["visualisatie", "dashboard", "dashboards", "grafiek", "grafieken"],
    ["cloud", "azure", "aws"],
    ["chatgpt", "generatieve ai", "generative ai", "llm"]
  ];

  // map: woord -> canonieke groep-naam (eerste woord van de groep)
  const SYNONYM_MAP = {};
  SYNONYM_GROUPS.forEach(group => {
    const canonical = group[0];
    group.forEach(word => { SYNONYM_MAP[word] = canonical; });
  });

  function applySynonyms(token) {
    return SYNONYM_MAP[token] || token;
  }

  let FAQ = [];
  let faqLoaded = false;
  let faqLoadFailed = false;

  function loadFaq() {
    fetch(FAQ_JSON_URL)
      .then(res => {
        if (!res.ok) throw new Error("Kon faq.json niet laden");
        return res.json();
      })
      .then(data => { FAQ = data; faqLoaded = true; })
      .catch(() => { faqLoadFailed = true; });
  }
  loadFaq();

  // ---- Tekst normalisatie / similarity ----
  function normalize(str) {
    return str
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const STOPWORDS = new Set(["de","het","een","en","van","is","wordt","worden","te","in","op","met","voor","aan","ik","je","jij","dit","dat","er","niet","ook","of","als","hoe","wat","welke","kunnen","kun","hebben","heb","mijn","onze","zijn","bij","we","wij","jullie"]);

  function tokenize(str) {
    return normalize(str)
      .split(" ")
      .filter(w => w.length > 1 && !STOPWORDS.has(w))
      .map(applySynonyms);
  }

  // simpele edit-distance voor typfout-tolerantie
  function wordsAreClose(a, b) {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 2) return false;
    const dp = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i-1] === b[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]);
      }
    }
    const dist = dp[a.length][b.length];
    return dist <= 1 || (a.length > 5 && dist <= 2);
  }

  function tokenOverlapScore(tokensA, tokensB) {
    if (tokensA.length === 0 || tokensB.length === 0) return 0;
    let matches = 0;
    tokensA.forEach(wa => {
      if (tokensB.some(wb => wordsAreClose(wa, wb))) matches++;
    });
    const union = new Set([...tokensA, ...tokensB]).size;
    return matches / union;
  }

  function similarityToText(userQuestion, targetText) {
    const ta = tokenize(userQuestion);
    const tb = tokenize(targetText);
    let score = tokenOverlapScore(ta, tb);
    const na = normalize(userQuestion), nb = normalize(targetText);
    if (na === nb) score = 1;
    else if (na.includes(nb) || nb.includes(na)) score = Math.max(score, 0.75);
    return score;
  }

  // Vergelijkt met de hoofdvraag EN alle alt_questions, neemt de hoogste score
  function similarityToItem(userQuestion, item) {
    let best = similarityToText(userQuestion, item.question);
    if (Array.isArray(item.alt_questions)) {
      item.alt_questions.forEach(alt => {
        const s = similarityToText(userQuestion, alt);
        if (s > best) best = s;
      });
    }
    return best;
  }

  function findBestMatch(question) {
    let best = null, bestScore = 0;
    FAQ.forEach(item => {
      const score = similarityToItem(question, item);
      if (score > bestScore) { bestScore = score; best = item; }
    });
    return { best, bestScore };
  }

  function isGreeting(text) {
    const norm = normalize(text);
    const words = norm.split(" ");
    if (words.length <= 3) return words.some(w => GREETINGS.includes(w));
    return false;
  }

  // ---- Widget HTML/CSS injecteren ----
  const style = document.createElement("style");
  style.textContent = `
    #faqw-bubble {
      position: fixed; bottom: 24px; right: 24px;
      width: 60px; height: 60px; border-radius: 50%;
      background: ${PRIMARY_COLOR}; color: #fff;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      z-index: 999998; transition: transform 0.15s ease;
    }
    #faqw-bubble:hover { transform: scale(1.06); }
    #faqw-bubble svg { width: 28px; height: 28px; }
    #faqw-panel {
      position: fixed; bottom: 96px; right: 24px;
      width: 360px; max-width: calc(100vw - 32px);
      height: 520px; max-height: calc(100vh - 140px);
      background: #fff; border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      display: none; flex-direction: column; overflow: hidden;
      z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    #faqw-panel.open { display: flex; }
    #faqw-header {
      background: #1f2937; color: #fff; padding: 14px 16px;
      font-weight: 600; font-size: 15px;
      display: flex; justify-content: space-between; align-items: center;
    }
    #faqw-header span.sub { display:block; font-weight:400; font-size:11px; color:#9ca3af; margin-top:2px; }
    #faqw-close { cursor: pointer; background:none; border:none; color:#fff; font-size:18px; line-height:1; }
    #faqw-messages { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
    .faqw-msg { max-width: 82%; padding: 9px 12px; border-radius: 13px; font-size: 13.5px; line-height: 1.4; white-space: pre-wrap; }
    .faqw-bot { background: #e5e7eb; color: #111827; align-self: flex-start; border-bottom-left-radius: 4px; }
    .faqw-user { background: ${PRIMARY_COLOR}; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
    .faqw-typing { background: #e5e7eb; align-self: flex-start; border-bottom-left-radius: 4px; padding: 11px 14px; display: flex; gap: 4px; }
    .faqw-typing span { width: 6px; height: 6px; border-radius: 50%; background: #9ca3af; display: inline-block; animation: faqw-bounce 1.2s infinite ease-in-out; }
    .faqw-typing span:nth-child(2) { animation-delay: 0.15s; }
    .faqw-typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes faqw-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-4px); opacity: 1; } }
    .faqw-suggestions { display: flex; flex-wrap: wrap; gap: 6px; align-self: flex-start; max-width: 90%; }
    .faqw-suggestion-btn { background: #fff; border: 1px solid ${PRIMARY_COLOR}; color: ${PRIMARY_COLOR}; padding: 5px 9px; border-radius: 9px; font-size: 12.5px; cursor: pointer; }
    .faqw-suggestion-btn:hover { background: #eff6ff; }
    #faqw-inputrow { display: flex; border-top: 1px solid #e5e7eb; padding: 8px; gap: 6px; }
    #faqw-input { flex: 1; border: 1px solid #d1d5db; border-radius: 9px; padding: 9px 11px; font-size: 13.5px; outline: none; }
    #faqw-input:focus { border-color: ${PRIMARY_COLOR}; }
    #faqw-input:disabled { background: #f3f4f6; }
    #faqw-send { background: ${PRIMARY_COLOR}; color: #fff; border: none; border-radius: 9px; padding: 0 14px; font-size: 13.5px; cursor: pointer; }
    #faqw-send:disabled { opacity: 0.5; cursor: default; }
    @media (max-width: 480px) {
      #faqw-panel { right: 12px; bottom: 86px; }
      #faqw-bubble { right: 16px; bottom: 16px; }
    }
  `;
  document.head.appendChild(style);

  const bubble = document.createElement("div");
  bubble.id = "faqw-bubble";
  bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`;
  document.body.appendChild(bubble);

  const panel = document.createElement("div");
  panel.id = "faqw-panel";
  panel.innerHTML = `
    <div id="faqw-header">
      <div>FAQ Chatbot<span class="sub">Data Science & AI</span></div>
      <button id="faqw-close" aria-label="Sluiten">&times;</button>
    </div>
    <div id="faqw-messages"></div>
    <div id="faqw-inputrow">
      <input type="text" id="faqw-input" placeholder="Typ je vraag..." />
      <button id="faqw-send">Stuur</button>
    </div>
  `;
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector("#faqw-messages");
  const inputEl = panel.querySelector("#faqw-input");
  const sendBtn = panel.querySelector("#faqw-send");
  const closeBtn = panel.querySelector("#faqw-close");

  let opened = false;
  let pendingMatch = null;
  let welcomed = false;

  bubble.addEventListener("click", () => {
    opened = !opened;
    panel.classList.toggle("open", opened);
    if (opened && !welcomed) {
      welcomed = true;
      botSayWithDelay("Hoi! Stel gerust je vraag over de opleiding Data Science & AI.");
    }
    if (opened) inputEl.focus();
  });
  closeBtn.addEventListener("click", () => {
    opened = false;
    panel.classList.remove("open");
  });

  function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = "faqw-msg " + (sender === "user" ? "faqw-user" : "faqw-bot");
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "faqw-typing";
    div.id = "faqw-typing-indicator";
    div.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function hideTyping() {
    const el = document.getElementById("faqw-typing-indicator");
    if (el) el.remove();
  }
  function setInputEnabled(enabled) {
    inputEl.disabled = !enabled;
    sendBtn.disabled = !enabled;
  }

  function randomDelay() {
    return TYPING_DELAY_MIN + Math.random() * (TYPING_DELAY_MAX - TYPING_DELAY_MIN);
  }

  function botSayWithDelay(text, callbackAfter) {
    setInputEnabled(false);
    showTyping();
    setTimeout(() => {
      hideTyping();
      addMessage(text, "bot");
      setInputEnabled(true);
      inputEl.focus();
      if (callbackAfter) callbackAfter();
    }, randomDelay());
  }

  function addSuggestionButtons(buttons) {
    const wrap = document.createElement("div");
    wrap.className = "faqw-suggestions";
    buttons.forEach(b => {
      const btn = document.createElement("button");
      btn.className = "faqw-suggestion-btn";
      btn.textContent = b.label;
      btn.onclick = () => { wrap.remove(); b.onClick(); };
      wrap.appendChild(btn);
    });
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function sendToEmailFallback() {
    botSayWithDelay("Helaas heb ik hier geen antwoord op in mijn FAQ. Stuur je vraag gerust naar " + SUPPORT_EMAIL + " — daar helpen ze je graag verder.");
  }

  function handleConfirmation(userText) {
    const positive = ["ja","yes","klopt","correct","precies","inderdaad","ok","oke","okay"];
    const negative = ["nee","no","niet","fout","verkeerd"];
    const norm = normalize(userText);
    if (positive.some(p => norm === p || norm.includes(p))) {
      const answer = pendingMatch.answer;
      pendingMatch = null;
      botSayWithDelay(answer);
      return true;
    }
    if (negative.some(n => norm === n || norm.includes(n))) {
      pendingMatch = null;
      sendToEmailFallback();
      return true;
    }
    return false;
  }

  function handleUserQuestion(question) {
    if (faqLoadFailed) {
      botSayWithDelay("Sorry, de FAQ-gegevens konden niet geladen worden. Stuur je vraag naar " + SUPPORT_EMAIL + ".");
      return;
    }
    if (!faqLoaded) {
      setInputEnabled(false);
      showTyping();
      const waitForFaq = setInterval(() => {
        if (faqLoaded || faqLoadFailed) {
          clearInterval(waitForFaq);
          hideTyping();
          setInputEnabled(true);
          handleUserQuestion(question);
        }
      }, 300);
      return;
    }

    if (isGreeting(question)) {
      botSayWithDelay(GREETING_REPLY);
      return;
    }

    const { best, bestScore } = findBestMatch(question);

    if (!best || bestScore < SIMILARITY_THRESHOLD) {
      sendToEmailFallback();
      return;
    }

    if (bestScore >= EXACT_MATCH_THRESHOLD) {
      botSayWithDelay(best.answer);
      return;
    }

    setInputEnabled(false);
    showTyping();
    setTimeout(() => {
      hideTyping();
      addMessage('Bedoel je: "' + best.question + '" ?', "bot");
      setInputEnabled(true);
      pendingMatch = best;
      addSuggestionButtons([
        { label: "Ja, dat bedoel ik", onClick: () => {
            const answer = best.answer;
            pendingMatch = null;
            botSayWithDelay(answer);
          } },
        { label: "Nee", onClick: () => { pendingMatch = null; sendToEmailFallback(); } }
      ]);
    }, randomDelay());
  }

  function onSend() {
    const text = inputEl.value.trim();
    if (!text || inputEl.disabled) return;
    addMessage(text, "user");
    inputEl.value = "";

    if (pendingMatch) {
      const handled = handleConfirmation(text);
      if (handled) return;
      pendingMatch = null;
    }

    handleUserQuestion(text);
  }

  sendBtn.addEventListener("click", onSend);
  inputEl.addEventListener("keydown", e => { if (e.key === "Enter") onSend(); });

})();