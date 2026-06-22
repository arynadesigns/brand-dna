  const state = { client:"", session:"Standard", industry:null, votes:[], dna:{} };

  const slides = Array.from(document.querySelectorAll('.slide'));
  let current = 0;
  slides.forEach((s,i)=>{ s.style.display = i===0 ? 'block' : 'none'; });
  slides[0].classList.add('enter');

  function go(to){
    if(to<0 || to>=slides.length || to===current) return;
    const cur = slides[current], nxt = slides[to];
    cur.classList.remove('enter'); cur.classList.add('leave');
    setTimeout(()=>{
      cur.style.display='none'; cur.classList.remove('leave');
      nxt.style.display='block'; void nxt.offsetWidth; nxt.classList.add('enter');
      current = to; window.scrollTo({top:0});
      if(nxt.dataset.slide==='swipe') Swiper.start();
      if(nxt.dataset.slide==='top3') Top3.render();
      if(nxt.dataset.slide==='never') NeverUse.render();
      if(nxt.dataset.slide==='more') Questions.render();
    }, 200);
  }

  document.addEventListener('click', e=>{
    const btn = e.target.closest('[data-action]');
    if(!btn) return;
    const act = btn.dataset.action;
    if(act==='next'){
      const name = document.getElementById('client');
      if(name) state.client = name.value.trim();
      if(current === slides.length-1){ flash('Ready for the next slide'); return; }
      go(current+1);
    } else if(act==='back'){ go(current-1); }
  });

  document.querySelectorAll('.option').forEach(o=>o.addEventListener('click',()=>{
    document.querySelectorAll('.option').forEach(x=>x.setAttribute('aria-pressed','false'));
    o.setAttribute('aria-pressed','true'); state.session = o.dataset.session;
  }));
  document.querySelectorAll('.ind').forEach(c=>c.addEventListener('click',()=>{
    document.querySelectorAll('.ind').forEach(x=>x.setAttribute('aria-pressed','false'));
    c.setAttribute('aria-pressed','true'); state.industry = c.dataset.name;
  }));

  const toast = document.getElementById('toast'); let tt;
  function flash(msg){ toast.innerHTML = msg; toast.classList.add('show'); clearTimeout(tt); tt=setTimeout(()=>toast.classList.remove('show'),2400); }

  // ---------------- Swiper ----------------
  const Swiper = (function(){
    const SIZE = { Quick:20, Standard:40, "In-depth":60 };
    let deck=[], idx=0, started=false, busy=false, stack, progFill, progCount, swipeCount, controls;

    function buildCard(m){
      const card=document.createElement('div');
      card.className='mark-card';
      const art=document.createElement('div'); art.className='mark-art'; art.style.background=m.bg;
      const letter=()=>{ const l=document.createElement('div'); l.className='mark-letter'; l.style.color=m.fg; l.textContent=m.name[0]; art.appendChild(l); };
      const img=document.createElement('img'); img.className='mark-img'; img.alt=m.name; img.referrerPolicy='no-referrer';
      if(m.embed){
        img.classList.add('mark-img--full');
        img.onerror=()=>{ img.remove(); letter(); };
        img.src=m.embed;
        art.appendChild(img);
      } else {
        let stage=0;
        img.onerror=()=>{
          if(stage===0 && m.si){ stage=1; img.src='https://cdn.simpleicons.org/'+m.si+'/'+m.fg.replace('#',''); }
          else { img.remove(); letter(); }
        };
        img.src='logos/'+m.slug+'.svg';
        art.appendChild(img);
      }
      const name=document.createElement('div'); name.className='mark-name'; name.textContent=m.name;
      const meta=document.createElement('div'); meta.className='mark-meta'; meta.textContent=(m.type+' \u00B7 '+m.cat).toUpperCase();
      const bl=document.createElement('div'); bl.className='vote-badge like'; bl.textContent='Keep';
      const bp=document.createElement('div'); bp.className='vote-badge pass'; bp.textContent='Pass';
      card.append(bl,bp,art,name,meta);
      card._m=m; card._bl=bl; card._bp=bp;
      return card;
    }

    function renderStack(){
      stack.innerHTML='';
      if(idx>=deck.length){ renderDone(); updateMeters(); return; }
      const back=deck[idx+1];
      if(back){ const b=buildCard(back); b.classList.add('is-back'); stack.appendChild(b); }
      const front=buildCard(deck[idx]); front.classList.add('is-front','pop');
      stack.appendChild(front); attachDrag(front);
      updateMeters();
    }

    function updateMeters(){
      const total=deck.length, n=Math.min(idx+1,total);
      progFill.style.width=(idx/total*100)+'%';
      const txt = idx>=total ? (total+' / '+total) : (n+' / '+total);
      progCount.textContent=txt; swipeCount.textContent=txt;
    }

    function attachDrag(card){
      let sx=0,sy=0,dx=0,dy=0,drag=false;
      const down=e=>{ if(busy) return; drag=true; card.style.transition='none'; sx=e.clientX; sy=e.clientY; card.setPointerCapture(e.pointerId); };
      const move=e=>{ if(!drag)return; dx=e.clientX-sx; dy=e.clientY-sy; const rot=dx*0.045;
        card.style.transform='translate('+dx+'px,'+dy+'px) rotate('+rot+'deg)';
        card._bl.style.opacity = dx>0 ? Math.min(dx/90,1) : 0;
        card._bp.style.opacity = dx<0 ? Math.min(-dx/90,1) : 0; };
      const up=e=>{ if(!drag)return; drag=false;
        if(Math.abs(dx)>115){ commit(dx>0?'like':'pass', card, dx, dy); }
        else { card.style.transition='transform .25s cubic-bezier(.16,.84,.44,1)'; card.style.transform='';
          card._bl.style.opacity=0; card._bp.style.opacity=0; } };
      card.addEventListener('pointerdown',down);
      card.addEventListener('pointermove',move);
      card.addEventListener('pointerup',up);
      card.addEventListener('pointercancel',up);
    }

    function commit(vote, card, dx, dy){
      if(busy) return;
      busy=true;
      const m=card._m;
      state.votes.push({slug:m.slug,name:m.name,vote:vote,mark:m});
      if(vote==='like') m.tags.forEach(t=>state.dna[t]=(state.dna[t]||0)+1);
      const dir = vote==='like'?1:-1;
      card.style.transition='transform .34s ease, opacity .34s ease';
      card.style.transform='translate('+(dir*680)+'px,'+((dy||0)+40)+'px) rotate('+(dir*22)+'deg)';
      card.style.opacity='0';
      idx++;
      setTimeout(function(){ renderStack(); busy=false; }, 240);
    }

    // programmatic vote (buttons / keyboard)
    function vote(v){
      if(busy) return;
      const card=stack.querySelector('.is-front'); if(!card)return;
      card._bl.style.opacity = v==='like'?1:0; card._bp.style.opacity = v==='pass'?1:0;
      commit(v, card, (v==='like'?120:-120), 0);
    }

    function renderDone(){
      const kept=state.votes.filter(v=>v.vote==='like').length;
      controls.style.visibility='hidden';
      const noun = kept===1 ? 'logo' : 'logos';
      stack.innerHTML =
        '<div class="swipe-done">'+
          '<div class="done-count">'+kept+'</div>'+
          '<h2>'+noun+' caught your eye</h2>'+
          '<p>Now let’s narrow it down to your absolute favourites.</p>'+
          '<button class="next" type="button" data-action="next">Pick my top 3 '+
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>'+
        '</div>';
      progFill.style.width='100%';
    }

    function start(){
      stack=document.getElementById('cardStack'); progFill=document.getElementById('progFill');
      progCount=document.getElementById('progCount'); swipeCount=document.getElementById('swipeCount');
      controls=document.getElementById('swipeControls');
      controls.style.visibility='visible';
      const head=ALL[0], rest=ALL.slice(1);
      for(let i=rest.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;const t=rest[i];rest[i]=rest[j];rest[j]=t;}
      const full=[head].concat(rest);
      const n=Math.min(SIZE[state.session]||full.length, full.length);
      deck=full.slice(0,n); idx=0; state.votes=[]; state.dna={};
      if(!started){
        controls.querySelectorAll('[data-vote]').forEach(b=>b.addEventListener('click',()=>vote(b.dataset.vote)));
        document.addEventListener('keydown',e=>{
          if(slides[current].dataset.slide!=='swipe')return;
          if(e.key==='ArrowRight') vote('like');
          else if(e.key==='ArrowLeft') vote('pass');
        });
        started=true;
      }
      renderStack();
    }
    return { start };
  })();


  // ---------------- Mark pickers (pick-3 grids) ----------------
  const CHECK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  const X_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  function makePicker(opts){
    let grid, countEl, contBtn, target=3, started=false;
    function tileArt(m){
      const art=document.createElement('div'); art.className='t3-tile'; art.style.background=m.bg;
      const letter=()=>{ const l=document.createElement('div'); l.className='t3-letter'; l.style.color=m.fg; l.textContent=m.name[0]; art.appendChild(l); };
      const img=document.createElement('img'); img.className='t3-img'+(m.embed?' t3-img--full':''); img.alt=m.name; img.referrerPolicy='no-referrer';
      if(m.embed){ img.onerror=()=>{img.remove();letter();}; img.src=m.embed; }
      else { let st=0; img.onerror=()=>{ if(st===0&&m.si){st=1;img.src='https://cdn.simpleicons.org/'+m.si+'/'+m.fg.replace('#','');} else {img.remove();letter();} }; img.src='logos/'+m.slug+'.svg'; }
      art.appendChild(img); return art;
    }
    function update(){
      const sel=grid.querySelectorAll('.t3.sel').length;
      countEl.textContent='Selected: '+sel+' / '+target;
      contBtn.classList.toggle('is-off', sel!==target);
      grid.classList.toggle('maxed', sel>=target);
    }
    function render(){
      grid=document.getElementById(opts.gridId); countEl=document.getElementById(opts.countId);
      contBtn=document.getElementById(opts.contId);
      const marks=opts.getMarks();
      target=Math.min(3, marks.length);
      grid.innerHTML='';
      marks.forEach(m=>{
        const b=document.createElement('button'); b.className='t3'; b.type='button'; b._m=m;
        const chk=document.createElement('span'); chk.className='t3-check'; chk.innerHTML=opts.badge;
        const nm=document.createElement('div'); nm.className='t3-name'; nm.textContent=m.name;
        b.append(tileArt(m), chk, nm);
        b.addEventListener('click',()=>{
          if(b.classList.contains('sel')){ b.classList.remove('sel'); }
          else { if(grid.querySelectorAll('.t3.sel').length>=target) return; b.classList.add('sel'); }
          update();
        });
        grid.appendChild(b);
      });
      update();
      if(!started){
        contBtn.addEventListener('click',()=>{
          if(contBtn.classList.contains('is-off')) return;
          opts.onLock(Array.from(grid.querySelectorAll('.t3.sel')).map(b=>b._m));
        });
        started=true;
      }
    }
    return { render };
  }

  const Top3 = makePicker({
    gridId:'top3Grid', countId:'top3Count', contId:'top3Continue', badge:CHECK_SVG,
    getMarks:()=>state.votes.filter(v=>v.vote==='like').map(v=>v.mark),
    onLock:picks=>{ state.top3=picks; go(current+1); }
  });

  const NeverUse = makePicker({
    gridId:'neverGrid', countId:'neverCount', contId:'neverContinue', badge:X_SVG,
    getMarks:()=>state.votes.filter(v=>v.vote==='pass').map(v=>v.mark),
    onLock:picks=>{ state.neverUse=picks; go(current+1); }
  });

  // ---------------- A few more questions ----------------
  const Questions = (function(){
    const SCALES = [
      ['Playful','Serious'], ['Accessible','Premium'], ['Familiar','Disruptive'],
      ['Classic','Modern'], ['Understated','Expressive']
    ];
    const FEELS = [
      ['🛡️','Trusted'], ['🎈','Playful'], ['✨','Premium'], ['⚡','Disruptive'],
      ['⬛','Minimal'], ['💪','Bold'], ['🙂','Friendly'], ['🚀','Innovative'],
      ['👑','Luxury'], ['🤝','Approachable'], ['🏛️','Authoritative'], ['🎉','Fun'],
      ['💎','Elegant'], ['🔥','Energetic'], ['🎩','Sophisticated'], ['🌿','Calm']
    ];
    const FEEL_MAX = 4;
    let built = false;
    function render(){
      if(built) return;
      state.scales = {};
      const scalesBox = document.getElementById('qScales');
      SCALES.forEach(([l,r])=>{
        const row=document.createElement('div'); row.className='scale';
        const le=document.createElement('div'); le.className='scale-end left'; le.textContent=l;
        const dots=document.createElement('div'); dots.className='scale-dots';
        for(let i=0;i<5;i++){
          const d=document.createElement('button'); d.type='button'; d.className='dot';
          d.setAttribute('aria-label', l+' to '+r+' — '+(i+1)+' of 5');
          d.addEventListener('click',()=>{
            dots.querySelectorAll('.dot').forEach(x=>x.classList.remove('on'));
            d.classList.add('on'); state.scales[l+'–'+r]=i;
          });
          dots.appendChild(d);
        }
        const re=document.createElement('div'); re.className='scale-end right'; re.textContent=r;
        row.append(le,dots,re); scalesBox.appendChild(row);
      });
      const chipsBox = document.getElementById('qChips');
      FEELS.forEach(([emoji,name])=>{
        const c=document.createElement('button'); c.type='button'; c.className='chip'; c.dataset.name=name;
        c.innerHTML='<span class="chip-emoji">'+emoji+'</span>'+name;
        c.addEventListener('click',()=>{
          if(c.classList.contains('sel')){ c.classList.remove('sel'); }
          else { if(chipsBox.querySelectorAll('.chip.sel').length>=FEEL_MAX) return; c.classList.add('sel'); }
          chipsBox.classList.toggle('maxed', chipsBox.querySelectorAll('.chip.sel').length>=FEEL_MAX);
        });
        chipsBox.appendChild(c);
      });
      document.getElementById('qResults').addEventListener('click',()=>{
        state.feel=Array.from(chipsBox.querySelectorAll('.chip.sel')).map(c=>c.dataset.name);
        state.admire=document.getElementById('qAdmire').value.trim();
        state.avoid=document.getElementById('qAvoid').value.trim();
        state.notes=document.getElementById('qNotes').value.trim();
        flash('Building your brand profile…');
        // when the results slide exists: go(current+1);
      });
      built = true;
    }
    return { render };
  })();

  window.brandDnaState = state;
