// main.js
// Garden-QA Engine v2
// - GitHub Raw 前提 / cache: 'no-store'
// - ゆるゆる検索 + カテゴリフィルタ + 候補表示

let gardenDB = null;
let activeCategory = "all";

// DB読み込み
async function loadDB() {
  if (gardenDB) return gardenDB;
  const res = await fetch("./garden-db.json", { cache: "no-store" });
  gardenDB = await res.json();
  return gardenDB;
}

// 文字正規化（ひらがな寄せ・空白削除など）
function normalize(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    // カタカナ → ひらがな
    .replace(/[ァ-ン]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    // 長音・空白・カッコ類削除
    .replace(/[ー\-]/g, "")
    .replace(/\s+/g, "")
    .replace(/[()（）「」『』、。,.]/g, "");
}

// スコアリング
function computeScore(question, item) {
  const q = normalize(question);
  if (!q) return 0;

  let score = 0;

  // keys との一致
  for (const k of item.keys || []) {
    const nk = normalize(k);
    if (!nk) continue;
    if (q === nk) {
      score += 6;              // 完全一致
    } else if (q.includes(nk) || nk.includes(q)) {
      score += 3;              // 部分一致
    }
  }

  // Q&Aテキストとのゆる一致
  for (const qa of item.qa || []) {
    const nq = normalize(qa.q);
    if (!nq) continue;
    if (nq.includes(q) || q.includes(nq)) score += 1;
  }

  return score;
}

// 検索ロジック
function searchItems(question, db, category = "all") {
  const list = db.items || [];
  const results = [];

  for (const item of list) {
    if (category !== "all" && item.category !== category) continue;

    const score = computeScore(question, item);
    if (score > 0) {
      results.push({ item, score });
    }
  }

  // スコア順にソート
  results.sort((a, b) => b.score - a.score);

  // ヒットなし → 頭2文字でバックオフ検索
  if (results.length === 0) {
    const q = normalize(question);
    if (q.length >= 2) {
      const head = q.slice(0, 2);
      const fallback = [];

      for (const item of list) {
        if (category !== "all" && item.category !== category) continue;
        const keys = item.keys || [];
        for (const k of keys) {
          const nk = normalize(k);
          if (nk.startsWith(head)) {
            fallback.push({ item, score: 1 });
            break;
          }
        }
      }

      if (fallback.length > 0) {
        return fallback.slice(0, 3);
      }
    }
  }

  return results.slice(0, 3); // 上位3件を返す
}

// UI: 回答表示
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

// UI: カテゴリ候補リスト
function renderSuggestions(db, category = "all") {
  const el = document.getElementById("suggestions");
  if (!el) return;

  const list = db.items || [];
  const filtered = list.filter(item =>
    category === "all" ? true : item.category === category
  );

  // 先頭から10件だけ軽く表示
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

  // イベント付与
  const buttons = el.querySelectorAll(".suggestion-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const text = btn.textContent.trim();
      const input = document.getElementById("question");
      input.value = text + " とは？";
      input.focus();
    });
  });
}

// 検索ボタン処理
async function runSearch() {
  const input = document.getElementById("question");
  const question = input.value || "";
  const answerBox = document.getElementById("answer");

  if (!question.trim()) {
    answerBox.innerHTML = "まずは質問を入力してください。（例：ハイビスカス 剪定）";
    return;
  }

  const db = await loadDB();
  const hits = searchItems(question, db, activeCategory);
  renderAnswer(question, hits);
}

// カテゴリボタンの見た目更新
function updateCategoryButtons() {
  const buttons = document.querySelectorAll(".cat-btn");
  buttons.forEach(btn => {
    const cat = btn.getAttribute("data-category");
    if (cat === activeCategory) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

// 初期化
document.addEventListener("DOMContentLoaded", async () => {
  const searchBtn = document.getElementById("searchBtn");
  searchBtn.addEventListener("click", runSearch);

  // Enterキーで検索
  const input = document.getElementById("question");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      runSearch();
    }
  });

  // カテゴリボタン
  const catButtons = document.querySelectorAll(".cat-btn");
  catButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      activeCategory = btn.getAttribute("data-category") || "all";
      updateCategoryButtons();
      const db = await loadDB();
      renderSuggestions(db, activeCategory);
      // カテゴリ切り替え時、回答欄は軽くリセット
      document.getElementById("answer").innerHTML =
        "カテゴリを切り替えました。気になる植物名やお悩みを入力してみてください。";
    });
  });

  // DB読み込み＆初期候補表示
  const db = await loadDB();
  updateCategoryButtons();
  renderSuggestions(db, activeCategory);
});
