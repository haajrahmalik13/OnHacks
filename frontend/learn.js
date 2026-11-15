/**
 * SitWell field guide.
 * Article copy and sources come first; reading tools come after.
 * Saved reads and the checklist are separate from sitting-session storage.
 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const icon = (name) => '<svg aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const sources = {
    who: {
      label: 'WHO · Physical activity',
      url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
    },
    cdc: {
      label: 'CDC · Benefits of activity',
      url: 'https://www.cdc.gov/physical-activity-basics/benefits/index.html',
    },
    osha: {
      label: 'OSHA · Working positions',
      url: 'https://www.osha.gov/etools/computer-workstations/positions',
    },
    standing: {
      label: 'CCOHS · Standing at work',
      url: 'https://www.ccohs.ca/oshanswers/ergonomics/standing/standing_basic.html',
    },
    trial: {
      label: 'Dunstan et al. · Diabetes Care, 2012',
      url: 'https://doi.org/10.2337/dc11-1931',
    },
    balance: {
      label: 'Botlero et al. · AJPM, 2024 · PubMed',
      url: 'https://pubmed.ncbi.nlm.nih.gov/39053656/',
    },
  };
  const articles = [
    {
      id: 'activity-sitting-balance',
      category: 'movement',
      tag: 'FEATURED RESEARCH / A 14-YEAR VIEW',
      icon: 'chart',
      number: '5,836',
      unit: 'AUSTRALIAN ADULTS',
      featured: true,
      title: 'Movement and sitting belong in the same picture.',
      body: 'A 2024 AusDiab cohort study followed 5,836 adults for a median 14.3 years. The lowest activity-to-sitting balance group had a higher all-cause mortality hazard than the highest group: adjusted hazard ratio 1.47 (95% confidence interval 1.21–1.79).',
      nuance:
        'This was observational research using self-reported baseline activity and sitting time. Association does not prove causation or predict your personal risk. The study’s index divided activity minutes/day by sitting hours/day; a seat-occupancy sensor alone cannot calculate it.',
      action:
        'Consider your movement across the whole day alongside sitting time. Your cushion captures only one part of that picture.',
      citation:
        'Botlero R, Sethi P, Gasevic D, Owen N, Barr E, Dunstan DW. A Physical Activity and Sitting Time Balance Index and All-Cause Mortality Risk. Am J Prev Med. 2024;67(6):832–840. DOI: 10.1016/j.amepre.2024.07.015. PMID: 39053656. Summary based on the published abstract.',
      source: 'balance',
    },
    {
      id: 'little-walk',
      category: 'movement',
      tag: 'A SMALL STUDY, A USEFUL CLUE',
      icon: 'walk',
      number: '02',
      unit: 'MINUTES',
      title: 'A short walk can do more than break the monotony.',
      body: 'In a randomized crossover trial, 19 adults aged 45–65 with overweight or obesity took two-minute walking breaks every 20 minutes. Their post-meal glucose and insulin responses were lower than during uninterrupted sitting.',
      nuance:
        'This was a small, short-term laboratory study. It does not show that a two-minute break prevents diabetes, or establish one break schedule for everyone.',
      action: 'Try this: use a natural task transition as a cue for a comfortable movement break.',
      source: 'trial',
    },
    {
      id: 'brain-benefits',
      category: 'movement',
      tag: 'BEYOND YOUR STEP COUNT',
      icon: 'spark',
      number: 'MORE',
      unit: 'THAN MUSCLES',
      title: 'Your mind is part of the picture.',
      body: 'CDC reports that a session of moderate-to-vigorous activity can reduce short-term anxiety in adults. Regular activity can also support sleep and brain health.',
      nuance:
        'That evidence concerns physical activity at specified intensities. It does not mean a cushion, a vibration, or a single stretch delivers the same benefits.',
      action: 'Keep desk breaks alongside the activities you enjoy outside your workspace.',
      source: 'cdc',
    },
    {
      id: 'whole-day',
      category: 'movement',
      tag: 'THE WHOLE-DAY VIEW',
      icon: 'leaf',
      number: 'AND',
      unit: 'NOT EITHER / OR',
      title: 'Desk breaks and exercise belong on the same team.',
      body: 'WHO encourages both more physical activity and less sedentary time. Activity includes everyday movement such as walking, cycling, and wheeling—not only organized workouts.',
      nuance:
        'SitWell’s break count measures your routine, not exercise intensity. Six breaks is a personal goal in this app, not a public-health target.',
      action: 'Give your day room for small pauses and a broader activity routine.',
      source: 'who',
    },
    {
      id: 'standing-tradeoff',
      category: 'desk',
      tag: 'THE STANDING-DESK PLOT TWIST',
      icon: 'up',
      number: '↕',
      unit: 'VARIETY MATTERS',
      title: 'Standing all day has its own tradeoffs.',
      body: 'CCOHS links prolonged standing at work with problems including sore feet, leg swelling, and muscular fatigue. A change of furniture is not a reason to stop changing position.',
      nuance:
        'This concerns prolonged occupational standing. It does not mean a brief standing break is harmful. A useful setup lets you vary positions and move comfortably.',
      action:
        'Think options, not endurance: sitting, supported standing, and movement as appropriate.',
      source: 'standing',
    },
    {
      id: 'posture-variety',
      category: 'desk',
      tag: 'LET GO OF THE STATUE ROUTINE',
      icon: 'mat',
      number: '↔',
      unit: 'ROOM TO ADJUST',
      title: 'Comfortable posture still needs variety.',
      body: 'OSHA recommends changing working positions frequently, even with good posture. Chair adjustments and periodic movement are part of that guidance.',
      nuance:
        'The FSR detects seat pressure, not a posture score. Your cushion cannot determine whole-body alignment.',
      action: 'Make a small, comfortable position change when you finish reading this.',
      source: 'osha',
    },
    {
      id: 'desk-support',
      category: 'desk',
      tag: 'START WITH THE SUPPORT',
      icon: 'settings',
      number: '04',
      unit: 'SMALL CHECKS',
      title: 'Let your workspace carry some of the load.',
      body: 'OSHA’s guidance includes supported feet, a supported back, relaxed shoulders, and straight wrists. Adjust the setup to the person using it.',
      nuance:
        'These are starting points, not a demand for one exact body shape or angle. Equipment, comfort, and access needs differ.',
      action: 'Try the four-point desk check below. There’s no score to chase.',
      source: 'osha',
    },
    {
      id: 'single-fsr',
      category: 'cushion',
      tag: 'PRODUCT NOTE / ONE FSR, ONE SIGNAL',
      icon: 'info',
      number: '01',
      unit: 'SENSOR INPUT',
      title: 'A simple signal. A clear purpose.',
      body: 'One force-sensitive resistor detects pressure at the seat. The signal helps estimate whether the cushion is occupied so the app can track seated time.',
      nuance:
        'It cannot identify left/right balance, precise body weight, or posture. An object may trigger it. The supplied backend marks readings at or above 500 ADC as Sitting; the hardware team should verify that threshold. Current readings are simulated.',
      action:
        'Try sitting down and standing up in the demo. The useful change is occupied versus away.',
      source: null,
    },
    {
      id: 'gentle-reminders',
      category: 'cushion',
      tag: 'PRODUCT NOTE / FIND YOUR RHYTHM',
      icon: 'bell',
      number: 'YOUR',
      unit: 'PACE. YOUR CALL.',
      title: 'A reminder should fit your day.',
      body: 'The Arduino demo gives one 800 ms pulse after 20 seconds of continuous sitting. Standing up rearms the reminder, even when Python keeps the same session open during its 10-second buffer.',
      nuance:
        'The 20-second interval is for the hackathon, not a medically validated sitting limit. The code suggests 30 minutes for everyday use. Browser presets only change the preview; firmware controls the motor.',
      action: 'Try a preview in My cushion. The FSR uses GPIO 36 and the motor output uses GPIO 2.',
      source: null,
    },
    {
      id: 'ten-second-buffer',
      category: 'cushion',
      tag: 'PRODUCT NOTE / THE TEN-SECOND BUFFER',
      icon: 'clock',
      number: '10',
      unit: 'SECONDS OF BUFFER',
      title: 'A brief interruption. A little breathing room.',
      body: 'Return before 10 seconds and the same session resumes. At 10 seconds away, the session closes. Every second away is excluded from seated time.',
      nuance:
        'A washroom trip will usually start a new session when you return. Sessions shorter than 3 seconds are not saved. The buffer handles brief interruptions; it is not a suggested break length.',
      action: 'Try standing up in the demo and watch the seated timer pause.',
      source: null,
    },
  ];
  const comparisons = [
    {
      icon: 'up',
      title: 'The standing desk',
      number: '01',
      upside: 'Adds another position to your working day.',
      tradeoff: 'Prolonged static standing can bring fatigue and discomfort too.',
      takeaway: 'Choose a setup that lets you change positions.',
      source: 'standing',
    },
    {
      icon: 'walk',
      title: 'The movement break',
      number: '02',
      upside:
        'Interrupts a long period in the chair. A small trial found improved post-meal glucose and insulin responses with walking breaks.',
      tradeoff: 'One laboratory result cannot promise long-term health outcomes for everyone.',
      takeaway: 'Make space for movement that suits your abilities.',
      source: 'trial',
    },
    {
      icon: 'mat',
      title: 'The smart cushion',
      number: '03',
      upside: 'Makes occupancy, session timing, and reminders visible with less manual logging.',
      tradeoff:
        'One FSR cannot measure left/right balance, precise body weight, or posture. This prototype uses simulated readings.',
      takeaway: 'An awareness tool, with you in control.',
      source: null,
    },
  ];
  const questions = [
    {
      statement: '“If I stand all day, I’ve solved the problem.”',
      answer: false,
      explanation:
        'Prolonged standing has tradeoffs too. CCOHS recommends opportunities to vary positions.',
      source: 'standing',
    },
    {
      statement: '“One FSR can tell whether I am leaning left or right.”',
      answer: false,
      explanation:
        'This cushion has one seat-pressure input for estimating occupancy. It cannot resolve which side you are leaning toward.',
      source: null,
    },
    {
      statement: '“Even a comfortable working posture should change during the day.”',
      answer: true,
      explanation: 'OSHA advises frequent changes of working position, even when posture is good.',
      source: 'osha',
    },
  ];
  const checklist = [
    ['feet', 'My feet have comfortable support from the floor or a footrest.'],
    ['back', 'My back has support that suits my sitting position.'],
    ['shoulders', 'My shoulders feel relaxed as I work.'],
    ['wrists', 'My wrists are reasonably straight when using my keyboard.'],
  ];
  let preferences = { saved: [], checks: [] };
  try {
    const data = JSON.parse(localStorage.getItem('sitwell.learn.v1'));
    if (data && Array.isArray(data.saved) && Array.isArray(data.checks)) preferences = data;
  } catch {}
  // Preserve saved reads from the earlier prototype under the corrected topics.
  preferences.saved = preferences.saved.map(
    (id) =>
      ({ 'pressure-not-grade': 'single-fsr', 'five-minute-rule': 'ten-second-buffer' })[id] || id,
  );
  function persist() {
    try {
      localStorage.setItem('sitwell.learn.v1', JSON.stringify(preferences));
      return true;
    } catch {
      return false;
    }
  }
  function sourceLink(key) {
    const source = sources[key];
    return source
      ? '<a class="learn-source" href="' +
          source.url +
          '" target="_blank" rel="noopener noreferrer">' +
          source.label +
          ' <span>↗</span></a>'
      : '<span class="learn-product-label">' + icon('mat') + ' SitWell product note</span>';
  }
  let filter = 'all',
    search = '';
  function renderArticles() {
    const saved = new Set(preferences.saved);
    const visible = articles.filter(
      (article) =>
        (filter === 'all' ||
          (filter === 'saved' ? saved.has(article.id) : article.category === filter)) &&
        [article.title, article.body, article.nuance, article.tag, article.citation || '']
          .join(' ')
          .toLowerCase()
          .includes(search),
    );
    $('learnResultCount').textContent =
      visible.length + ' ' + (visible.length === 1 ? 'little read' : 'little reads');
    $('learnArticles').innerHTML = visible.length
      ? visible.map((article) => renderArticle(article, saved)).join('')
      : '<div class="learn-empty card">' +
        icon('book') +
        '<h3>' +
        (filter === 'saved' ? 'A little library, just for you.' : 'No matching reads. Yet.') +
        '</h3><p>' +
        (filter === 'saved'
          ? 'Tap the book icon on a card to keep it here.'
          : 'Try “walking”, “posture”, or another topic.') +
        '</p><button class="button button-white" id="resetLearnFilter">Explore all topics ' +
        icon('arrow') +
        '</button></div>';
  }
  function renderArticle(article, saved) {
    const isSaved = saved.has(article.id);
    return (
      '<article class="learn-article card' +
      (article.featured ? ' research-feature' : '') +
      '">' +
      '<div class="learn-article-top"><span class="learn-topic-icon">' +
      icon(article.icon) +
      '</span>' +
      '<button class="learn-save ' +
      (isSaved ? 'is-saved' : '') +
      '" data-save-read="' +
      article.id +
      '" aria-pressed="' +
      isSaved +
      '" aria-label="' +
      (isSaved ? 'Unsave: ' : 'Save: ') +
      article.title +
      '">' +
      icon('book') +
      '</button></div>' +
      '<span class="learn-article-tag">' +
      article.tag +
      '</span>' +
      '<div class="learn-article-number">' +
      article.number +
      '<span>' +
      article.unit +
      '</span></div>' +
      '<h3>' +
      article.title +
      '</h3><p>' +
      article.body +
      '</p>' +
      '<details class="learn-nuance"><summary>The useful nuance <span>+</span></summary><p>' +
      article.nuance +
      '</p></details>' +
      '<div class="learn-action"><span>TAKE IT INTO YOUR DAY</span><p>' +
      article.action +
      '</p></div>' +
      (article.citation ? '<p class="learn-citation">' + article.citation + '</p>' : '') +
      '<div class="learn-article-source">' +
      sourceLink(article.source) +
      '</div></article>'
    );
  }
  function renderComparisons() {
    $('learnComparisons').innerHTML = comparisons
      .map(
        (item) =>
          '<article class="learn-comparison card"><div class="learn-comparison-top">' +
          icon(item.icon) +
          '<span>' +
          item.number +
          '</span></div><h3>' +
          item.title +
          '</h3><div class="comparison-row upside"><span>THE UPSIDE</span><p>' +
          item.upside +
          '</p></div><div class="comparison-row tradeoff"><span>THE TRADEOFF</span><p>' +
          item.tradeoff +
          '</p></div><div class="comparison-takeaway">' +
          icon('arrow') +
          '<p>' +
          item.takeaway +
          '</p></div>' +
          sourceLink(item.source) +
          '</article>',
      )
      .join('');
  }
  let quizIndex = 0,
    score = 0,
    answered = false;
  function renderQuiz() {
    answered = false;
    if (quizIndex >= questions.length) {
      $('quizProgress').textContent = 'COMPLETE';
      $('learnQuiz').innerHTML =
        '<div class="quiz-complete">' +
        icon('spark') +
        '<div class="quiz-score">' +
        score +
        '<span> / ' +
        questions.length +
        '</span></div><h2>A little wiser. A little more aware.</h2><p>Keep the nuance. Take the useful bits into your day.</p><button class="button button-green" id="restartLearnQuiz">One more go ' +
        icon('arrow') +
        '</button></div>';
      return;
    }
    const question = questions[quizIndex];
    $('quizProgress').textContent = String(quizIndex + 1).padStart(2, '0') + ' / 03';
    $('learnQuiz').innerHTML =
      '<span class="quiz-kicker">FACT OR MYTH?</span><h3>' +
      question.statement +
      '</h3><p class="quiz-invitation">Go with your instinct. Then get the whole story.</p><div class="quiz-answers"><button data-quiz-answer="true">Sounds true ' +
      icon('check') +
      '</button><button data-quiz-answer="false">That’s a myth ' +
      icon('close') +
      '</button></div><div id="quizFeedback" class="quiz-feedback" aria-live="polite"></div>';
  }
  function answerQuiz(value) {
    if (answered) return;
    answered = true;
    const question = questions[quizIndex],
      correct = value === question.answer;
    if (correct) score++;
    document.querySelectorAll('[data-quiz-answer]').forEach((button) => {
      button.disabled = true;
      button.classList.toggle('correct', button.dataset.quizAnswer === String(question.answer));
      button.classList.toggle('incorrect', button.dataset.quizAnswer === String(value) && !correct);
    });
    $('quizFeedback').innerHTML =
      '<strong>' +
      (correct ? 'You’ve got it.' : 'There’s a little more to it.') +
      '</strong><p>' +
      question.explanation +
      '</p>' +
      sourceLink(question.source) +
      '<button class="button button-green" id="nextLearnQuestion">' +
      (quizIndex === questions.length - 1 ? 'See my result' : 'Next little insight') +
      ' ' +
      icon('arrow') +
      '</button>';
  }
  function renderChecklist() {
    $('deskChecklist').innerHTML = checklist
      .map(
        ([id, label]) =>
          '<label class="desk-check-item"><input type="checkbox" data-desk-check="' +
          id +
          '" ' +
          (preferences.checks.includes(id) ? 'checked' : '') +
          '><span class="check-box">' +
          icon('check') +
          '</span><span>' +
          label +
          '</span></label>',
      )
      .join('');
    updateCheckCount();
  }
  function updateCheckCount() {
    const count = checklist.filter(([id]) => preferences.checks.includes(id)).length;
    $('deskCheckCount').textContent =
      count + ' of 4 checked' + (count === 4 ? ' · A good place to start.' : '');
  }
  document.addEventListener('click', (event) => {
    const topic = event.target.closest('[data-learn-filter]');
    if (topic) {
      filter = topic.dataset.learnFilter;
      document.querySelectorAll('[data-learn-filter]').forEach((button) => {
        const active = button === topic;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      renderArticles();
    }
    const save = event.target.closest('[data-save-read]');
    if (save) {
      const id = save.dataset.saveRead;
      preferences.saved = preferences.saved.includes(id)
        ? preferences.saved.filter((x) => x !== id)
        : [...preferences.saved, id];
      const persisted = persist();
      if (filter === 'saved') renderArticles();
      else {
        const selected = preferences.saved.includes(id),
          article = articles.find((a) => a.id === id);
        save.classList.toggle('is-saved', selected);
        save.setAttribute('aria-pressed', String(selected));
        save.setAttribute('aria-label', (selected ? 'Unsave: ' : 'Save: ') + article.title);
      }
      if (!persisted) $('learnResultCount').textContent = 'Reading list kept for this visit only';
    }
    const answer = event.target.closest('[data-quiz-answer]');
    if (answer) answerQuiz(answer.dataset.quizAnswer === 'true');
    if (event.target.closest('#nextLearnQuestion')) {
      quizIndex++;
      renderQuiz();
    }
    if (event.target.closest('#restartLearnQuiz')) {
      quizIndex = 0;
      score = 0;
      renderQuiz();
    }
    if (event.target.closest('#resetLearnFilter')) {
      search = '';
      $('learnSearch').value = '';
      document.querySelector('[data-learn-filter="all"]').click();
    }
  });
  $('learnSearch').addEventListener('input', (event) => {
    search = event.target.value.trim().toLowerCase();
    renderArticles();
  });
  $('deskChecklist').addEventListener('change', (event) => {
    const id = event.target.dataset.deskCheck;
    if (!id) return;
    preferences.checks = event.target.checked
      ? [...new Set([...preferences.checks, id])]
      : preferences.checks.filter((x) => x !== id);
    const saved = persist();
    updateCheckCount();
    if (!saved) $('deskCheckCount').textContent += ' · This visit only';
  });
  renderArticles();
  renderComparisons();
  renderQuiz();
  renderChecklist();
})();
