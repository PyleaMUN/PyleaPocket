/*****************
 * SPA navigation
 *****************/
document.getElementById('nav').addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON') return;
  const tgt = e.target.dataset.target;
  document.querySelectorAll('#nav button').forEach(btn =>
    btn.classList.toggle('active', btn === e.target)
  );
  document.querySelectorAll('main section').forEach(sec =>
    sec.classList.toggle('active', sec.id === tgt)
  );
});

/*****************
 * Clause bank
 *****************/
const preC = [
  "Affirming","Alarmed by","Approving","Aware of","Bearing in mind","Believing",
  "Confident","Contemplating","Convinced","Declaring","Deeply concerned",
  "Deeply conscious","Deeply disturbed","Deeply regretting","Desiring","Emphasizing",
  "Expecting","Expressing its appreciation","Fulfilling","Fully aware",
  "Fully believing","Further recalling","Gravely concerned","Having adopted",
  "Having considered","Having examined","Having heard","Having received",
  "Having studied","Keeping in mind","Mindful","Noting with approval",
  "Noting with deep concern","Noting further","Noting with regret",
  "Noting with satisfaction","Observing","Pointing out","Reaffirming","Recalling",
  "Recognizing","Referring","Seeking","Taking into account","Taking note",
  "Viewing with appreciation","Welcoming"
];
const opC = [
  "Accepts","Affirms","Approves","Authorizes","Calls","Calls upon","Condemns",
  "Confirms","Congratulates","Considers","Declares accordingly","Deplores",
  "Designates","Draws attention","Emphasizes","Encourages","Endorses",
  "Expresses its appreciation","Expresses its hope","Further invites",
  "Further proclaims","Further recommends","Further reminds","Further requests",
  "Further resolves","Has resolved","Notes","Proclaims","Reaffirms","Recommends",
  "Regrets","Reminds","Requests","Solemnly affirms","Strongly condemns",
  "Supports","Takes note of","Transmits","Trusts"
];
const renderClauses = (arr, id) => {
  const box = document.getElementById(id);
  arr.forEach(txt => {
    const b = document.createElement('button');
    b.textContent = txt;
    b.onclick = () => navigator.clipboard.writeText(`${txt}, `);
    box.appendChild(b);
  });
};
renderClauses(preC, 'preList');
renderClauses(opC, 'opList');

/*****************
 * Utility – cache
 *****************/
const DAY = 86_400_000;
const fetchCached = async (key, url, parse = x => x) => {
  const ts = +localStorage.getItem(`${key}:ts` || 0);
  if (Date.now() - ts < 30 * DAY) {
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  }
  const res = await fetch(url);
  const raw = await res.text();
  const data = parse(raw);
  localStorage.setItem(key, JSON.stringify(data));
  localStorage.setItem(`${key}:ts`, Date.now());
  return data;
};

/*****************
 * UN Charter & UDHR
 *****************/
(async () => {
  const cBox = document.getElementById('charterDoc');
  const uBox = document.getElementById('udhrDoc');
  try {
    cBox.textContent = 'Downloading…';
    const charter = await fetchCached(
      'charter',
      'https://raw.githubusercontent.com/datasets/un-charter/master/charter.txt'
    );
    cBox.textContent = charter;
    const udhr = await fetchCached(
      'udhr',
      'https://raw.githubusercontent.com/datasets/udhr/master/udhr_english.txt'
    );
    uBox.textContent = udhr;
  } catch {
    cBox.textContent = uBox.textContent =
      '❗ First load requires internet connection.';
  }
})();
const attachSearch = (inputId, docId) => {
  const inp = document.getElementById(inputId);
  const box = document.getElementById(docId);
  let original = '';
  inp.addEventListener('focus', () => {
    if (!original) original = box.textContent;
  });
  inp.addEventListener('input', () => {
    const q = inp.value.trim().toLowerCase();
    if (!q) {
      box.innerHTML = original;
      return;
    }
    const re = new RegExp(q.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'gi');
    box.innerHTML = original.replace(re, m => `<mark>${m}</mark>`);
  });
};
attachSearch('charterSearch', 'charterDoc');
attachSearch('udhrSearch', 'udhrDoc');

/*****************
 * Factbook
 *****************/
(async () => {
  const box = document.getElementById('factResults');
  const search = document.getElementById('factSearch');
  try {
    const countries = await fetchCached(
      'countries',
      'https://restcountries.com/v3.1/all',
      raw =>
        JSON.parse(raw).map(c => ({
          name: c.name.common,
          pop: c.population,
          area: c.area,
          capital: (c.capital || [''])[0],
          region: c.region,
          flag: c.flag
        }))
    );
    const render = q => {
      box.innerHTML = '';
      countries
        .filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(c => {
          const div = document.createElement('div');
          div.className = 'country-card';
          div.innerHTML = `
            <h3>${c.flag} ${c.name}</h3>
            <p><strong>Capital:</strong> ${c.capital || '—'}</p>
            <p><strong>Region:</strong> ${c.region}</p>
            <p><strong>Population:</strong> ${c.pop.toLocaleString()}</p>
            <p><strong>Area:</strong> ${c.area.toLocaleString()} km²</p>`;
          box.appendChild(div);
        });
    };
    render('');
    search.oninput = e => render(e.target.value);
  } catch {
    box.textContent = '❗ First load needs internet.';
  }
})();

/*****************
 * UN News
 *****************/
(async () => {
  const feed = document.getElementById('newsFeed');
  const btn = document.getElementById('refreshNews');
  const load = async force => {
    if (!force) {
      const cached = localStorage.getItem('newsHTML');
      if (cached) {
        feed.innerHTML = cached;
        return;
      }
    }
    try {
      const xmlTxt = await (
        await fetch('https://news.un.org/feed/subscribe/en/news/all/rss.xml')
      ).text();
      const items = [
        ...new DOMParser()
          .parseFromString(xmlTxt, 'application/xml')
          .querySelectorAll('item')
      ]
        .slice(0, 20)
        .map(it => ({
          title: it.querySelector('title').textContent,
          link: it.querySelector('link').textContent,
          date: new Date(it.querySelector('pubDate').textContent)
        }));
      feed.innerHTML = '';
      items.forEach(i => {
        const div = document.createElement('div');
        div.className = 'news-item';
        div.innerHTML = `<a href="${i.link}" target="_blank">${i.title}</a>
                         <br><small>${i.date.toLocaleString()}</small>`;
        feed.appendChild(div);
      });
      localStorage.setItem('newsHTML', feed.innerHTML);
    } catch {
      feed.textContent = '❗ Unable to fetch feed.';
    }
  };
  btn.onclick = () => load(true);
  load();
})();

/*****************
 * NGO directory
 *****************/
(async () => {
  const box = document.getElementById('ngoResults');
  const search = document.getElementById('ngoSearch');
  const regionSel = document.getElementById('ngoRegion');
  try {
    const ngos = await fetchCached(
      'ngos',
      'https://raw.githubusercontent.com/peacecorps/global-ngos/master/ngos.json',
      JSON.parse
    );
    [...new Set(ngos.map(n => n.region).filter(Boolean))]
      .sort()
      .forEach(r => {
        const opt = new Option(r, r);
        regionSel.add(opt);
      });
    const render = () => {
      const q = search.value.toLowerCase();
      const reg = regionSel.value;
      box.innerHTML = '';
      ngos
        .filter(
          n =>
            (!q || n.name.toLowerCase().includes(q)) &&
            (!reg || n.region === reg)
        )
        .slice(0, 200)
        .forEach(n => {
          const div = document.createElement('div');
          div.className = 'country-card';
          div.innerHTML = `<h3>${n.name}</h3>
                           <p><em>${n.region}</em></p>
                           <p>${n.description || ''}</p>`;
          box.appendChild(div);
        });
    };
    render();
    search.oninput = render;
    regionSel.onchange = render;
  } catch {
    box.textContent = '❗ First load needs internet.';
  }
})();

/*****************
 * Service-worker cache
 *****************/
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(
    URL.createObjectURL(
      new Blob(
        [
          `
self.addEventListener('install',e=>e.waitUntil(
  caches.open('pyleapocket').then(c=>c.addAll(['./','pyleaPocket.js']))
));
self.addEventListener('fetch',e=>{
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request))
  );
});
        `
        ],
        { type: 'text/javascript' }
      )
    )
  );
}
