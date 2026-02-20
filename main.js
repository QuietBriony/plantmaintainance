// Garden-QA Engine main.js

const ASSET_VERSION = "20260220b";
const DB_URL = `./plantmaintain-db.json?v=${ASSET_VERSION}`;

let gardenDB = null;
let activeCategory = "all";

function renderSuggestionError(message) {
  const el = document.getElementById("suggestions");
  if (!el) return;
  el.innerHTML = `<p>⚠️ データ読み込みエラー<br>${message}</p>`;
}

function renderAnswerStatus(message) {
  const el = document.getElementById("answer");
  if (!el) return;
  el.innerHTML = `<p>${message}</p>`;
}

async function loadDB() {
  if (gardenDB) return gardenDB;

  try {
    const res = await fetch(DB_URL, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} / URL: ${res.url || DB_URL}`);
    }

    let parsed;
    try {
      parsed = await res.json();
    } catch (parseErr) {
      throw new Error(`JSON parse error / URL: ${res.url || DB_URL} / ${String(parseErr)}`);
    }

    if (!parsed || !Array.isArray(parsed.items)) {
      throw new Error(`DB format error: items配列がありません / URL: ${res.url || DB_URL}`);
    }

    gardenDB = parsed;
    return gardenDB;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Garden-QA] DB load failed", { url: DB_URL, error: err });
    renderSuggestionError(msg);
    renderAnswerStatus(`DB読み込み失敗: ${msg}`);
    return null;
  }
}

function normalize(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/[ァ-ン]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[ー\-]/g, "")
    .replace(/\s+/g, "")
    .replace(/[()（）「」『』、。,.]/g, "");
}

function computeScore(question, item) {
  const q = normalize(question);
  if (!q) return 0;

  let score = 0;

  for (const k of item.keys || []) {
    const nk = normalize(k);
    if (!nk) continue;
    if (q === nk) score += 6;
    else if (q.includes(nk) || nk.includes(q)) score += 3;
  }

  for (const qa of item.qa || []) {
    const nq = normalize(qa.q);
    if (!nq) continue;
    if (nq.includes(q) || q.includes(nq)) score += 1;
  }

  return score;
}

function searchItems(question, db, category = "all") {
  const list = db.items || [];
  const results = [];

  for (const item of list) {
    if (category !== "all" && item.category !== category) continue;
    const score = computeScore(question, item);
    if (score > 0) results.push({ item, score });
  }

  results.sort((a, b) => b.score - a.score);

  if (results.length === 0) {
    const q = normalize(question);
    if (q.length >= 2) {
      const head = q.slice(0, 2);
      const fallback = [];
      for (const item of list) {
        if (category !== "all" && item.category !== category) continue;
        for (const k of item.keys || []) {
          const nk = normalize(k);
          if (nk.startsWith(head)) {
            fallback.push({ item, score: 1 });
            break;
          }
        }
      }
      if (fallback.length > 0) return fallback.slice(0, 3);
    }
  }

  return results.slice(0, 3);
}

function renderAnswer(question, hits) {
  const el = document.getElementById("answer");
  if (!hits || hits.length === 0) {
    el.innerHTML = `
      <p>ぴったりの回答は見つかりませんでした。<br>
      ・キーワードを少し変える<br>
      ・「ハイビスカス 剪定」など、植物名＋やりたいこと<br>
      で試してみてください。</p>
    `;
    return;
  }

  const best = hits[0].item;
  let html = "";
  html += `<h3>🔍 ヒットした項目：${best.keys[0] || "不明"}</h3>`;
  html += `<p class="question-view">Q: ${question}</p>`;
  html += `<ul>`;
  for (const qa of best.qa || []) {
    html += `<li><b>${qa.q}</b><br>${qa.a}</li>`;
  }
  html += `</ul>`;

  if (hits.length > 1) {
    html += `<hr><h4>ほかの候補（ゆるく近そうなもの）</h4><ul>`;
    for (let i = 1; i < hits.length; i++) {
      html += `<li>${hits[i].item.keys[0] || "不明"}（${hits[i].item.category}）</li>`;
    }
    html += `</ul>`;
  }

  el.innerHTML = html;
}

function renderSuggestions(db, category = "all") {
  const el = document.getElementById("suggestions");
  if (!el) return;

  const filtered = (db.items || []).filter(item =>
    category === "all" ? true : item.category === category
  );
  const slice = filtered.slice(0, 10);

  if (slice.length === 0) {
    el.innerHTML = "<p>このカテゴリの候補データはまだありません。</p>";
    return;
  }

  let html = "<ul>";
  for (const item of slice) {
    const label = item.keys[0] || item.id;
    html += `<li><button class="suggestion-btn" data-id="${item.id}">${label}</button></li>`;
  }
  html += "</ul>";
  el.innerHTML = html;

  el.querySelectorAll(".suggestion-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById("question");
      input.value = `${btn.textContent.trim()} とは？`;
      input.focus();
    });
  });
}

async function runSearch() {
  const input = document.getElementById("question");
  const question = input.value || "";

  if (!question.trim()) {
    renderAnswerStatus("まずは質問を入力してください。（例：ハイビスカス 剪定）");
    return;
  }

  const db = await loadDB();
  if (!db) return;

  const hits = searchItems(question, db, activeCategory);
  renderAnswer(question, hits);
}

function updateCategoryButtons() {
  document.querySelectorAll(".cat-btn").forEach(btn => {
    const cat = btn.getAttribute("data-category");
    btn.classList.toggle("active", cat === activeCategory);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  renderAnswerStatus("JS loaded. データを読み込んでいます...");

  const searchBtn = document.getElementById("searchBtn");
  searchBtn.addEventListener("click", runSearch);

  const input = document.getElementById("question");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
  });

  document.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      activeCategory = btn.getAttribute("data-category") || "all";
      updateCategoryButtons();
      const db = await loadDB();
      if (!db) return;
      renderSuggestions(db, activeCategory);
      renderAnswerStatus("カテゴリを切り替えました。植物名やお悩みを入力してください。");
    });
  });

  updateCategoryButtons();
  const db = await loadDB();
  if (!db) {
    renderSuggestionError("読み込み中表示を終了しました。上記エラーを確認してください。");
    return;
  }

  renderSuggestions(db, activeCategory);
  renderAnswerStatus("準備完了。植物名＋お悩みで検索できます。");
});
