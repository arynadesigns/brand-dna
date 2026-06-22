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
      if(nxt.dataset.slide==='results') Results.render();
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
    let deck=[], idx=0, started=false, busy=false, stack, progFill, progCount, swipeCount, controls, shownAt=0;

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
      shownAt=performance.now();
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
      state.votes.push({slug:m.slug,name:m.name,vote:vote,mark:m,ms:shownAt?performance.now()-shownAt:0});
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

  // Shared logo tile: coloured square with the mark's logo (svg -> simpleicons -> letter fallback).
  function markTile(m){
    const art=document.createElement('div'); art.className='t3-tile'; art.style.background=m.bg;
    const letter=()=>{ const l=document.createElement('div'); l.className='t3-letter'; l.style.color=m.fg; l.textContent=m.name[0]; art.appendChild(l); };
    const img=document.createElement('img'); img.className='t3-img'+(m.embed?' t3-img--full':''); img.alt=m.name; img.referrerPolicy='no-referrer';
    if(m.embed){ img.onerror=()=>{img.remove();letter();}; img.src=m.embed; }
    else { let st=0; img.onerror=()=>{ if(st===0&&m.si){st=1;img.src='https://cdn.simpleicons.org/'+m.si+'/'+m.fg.replace('#','');} else {img.remove();letter();} }; img.src='logos/'+m.slug+'.svg'; }
    art.appendChild(img); return art;
  }

  function makePicker(opts){
    let grid, countEl, contBtn, target=3, started=false;
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
        b.append(markTile(m), chk, nm);
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
  const SCALE_OPTIONS = [
    ['Playful','Serious'], ['Accessible','Premium'], ['Familiar','Disruptive'],
    ['Classic','Modern'], ['Understated','Expressive']
  ];
  const FEEL_OPTIONS = [
    ['🛡️','Trusted'], ['🎈','Playful'], ['✨','Premium'], ['⚡','Disruptive'],
    ['⬛','Minimal'], ['💪','Bold'], ['🙂','Friendly'], ['🚀','Innovative'],
    ['👑','Luxury'], ['🤝','Approachable'], ['🏛️','Authoritative'], ['🎉','Fun'],
    ['💎','Elegant'], ['🔥','Energetic'], ['🎩','Sophisticated'], ['🌿','Calm']
  ];
  const FEEL_EMOJI = Object.fromEntries(FEEL_OPTIONS.map(([e,n])=>[n,e]));

  const Questions = (function(){
    const SCALES = SCALE_OPTIONS;
    const FEELS = FEEL_OPTIONS;
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
        go(current+1);
      });
      built = true;
    }
    return { render };
  })();

  // ---------------- Results: Brand Style Profile ----------------
  const Results = (function(){
    const TYPE_WORD={'Icon / Symbol':'Icon','Wordmark':'Wordmark','Monogram':'Monogram','Mascot':'Mascot','Lettermark':'Lettermark'};
    const TYPE_DESC={'Icon / Symbol':'icon and symbol-based logos','Wordmark':'wordmark-driven logos','Monogram':'monogram logos','Mascot':'mascot-led logos','Lettermark':'lettermark logos'};
    const TYPE_BLURB={'Icon / Symbol':'Bold, distinctive marks that stand on their own.','Wordmark':'Type-led logos built from the full name.','Monogram':'Compact marks built from initials.','Mascot':'Character-driven, personable marks.','Lettermark':'Single-letter, initial-based marks.'};
    const COLOR_HEX={Black:'#111114',White:'#f4f4f5',Charcoal:'#3a3a42',Grey:'#9aa0aa',Red:'#E5484D',Orange:'#F76B15',Yellow:'#FFD02F',Green:'#30A46C',Teal:'#16B8A6',Blue:'#3E7BFA',Purple:'#7C5CFF',Pink:'#E93D82',Multicolour:'#9aa0aa'};

    function hsl(hex){
      hex=(hex||'#888').replace('#',''); if(hex.length===3) hex=hex.split('').map(c=>c+c).join('');
      const r=parseInt(hex.slice(0,2),16)/255,g=parseInt(hex.slice(2,4),16)/255,b=parseInt(hex.slice(4,6),16)/255;
      const mx=Math.max(r,g,b),mn=Math.min(r,g,b); let h=0,s=0,l=(mx+mn)/2;
      if(mx!==mn){ const d=mx-mn; s=l>0.5?d/(2-mx-mn):d/(mx+mn);
        h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4; h*=60; }
      return {h, s:s*100, l:l*100};
    }
    function colorName(hex){
      const {h,s,l}=hsl(hex);
      if(l<=13) return 'Black';
      if(l>=92 && s<14) return 'White';
      if(s<14) return l<46?'Charcoal':'Grey';
      if(h<16||h>=346) return 'Red';
      if(h<45) return 'Orange';
      if(h<66) return 'Yellow';
      if(h<162) return 'Green';
      if(h<200) return 'Teal';
      if(h<250) return 'Blue';
      if(h<292) return 'Purple';
      return 'Pink';
    }
    function tally(arr,fn){ const m=new Map(); arr.forEach(x=>{const k=fn(x); if(k==null)return; m.set(k,(m.get(k)||0)+1);}); return [...m.entries()].sort((a,b)=>b[1]-a[1]); }
    function tcase(s){ return s? s[0].toUpperCase()+s.slice(1) : s; }

    function typography(tagCounts, feel){
      const f=(feel||[]).map(x=>x.toLowerCase());
      const t=k=>tagCounts.get(k)||0;
      const score={
        serif: t('serif')+t('elegant')+t('classic')+ (f.includes('premium')?2:0)+(f.includes('luxury')?2:0)+(f.includes('sophisticated')?2:0)+(f.includes('elegant')?2:0),
        rounded: t('rounded')+t('playful')+t('friendly')+ (f.includes('playful')?2:0)+(f.includes('friendly')?2:0)+(f.includes('fun')?2:0)+(f.includes('approachable')?2:0),
        geometric: t('geometric')+t('minimal')+t('sharp')+ (f.includes('minimal')?2:0)+(f.includes('bold')?2:0)+(f.includes('innovative')?1:0)
      };
      const best=Object.entries(score).sort((a,b)=>b[1]-a[1])[0];
      if(!best || best[1]===0) return {name:'Versatile humanist sans-serif', refs:'Inter, Manrope, Plus Jakarta Sans'};
      if(best[0]==='serif') return {name:'Refined contemporary serif', refs:'Canela, Tiempos, Freight Display'};
      if(best[0]==='rounded') return {name:'Friendly rounded sans', refs:'Poppins, Quicksand, Nunito'};
      return {name:'Clean geometric sans', refs:'Inter, Manrope, Plus Jakarta Sans'};
    }

    function build(){
      const liked=state.votes.filter(v=>v.vote==='like').map(v=>v.mark);
      const passed=state.votes.filter(v=>v.vote==='pass').map(v=>v.mark);
      const types=tally(liked, m=>m.type);
      const colors=tally(liked, m=>colorName(m.bg));
      const tagCounts=new Map(); liked.forEach(m=>(m.tags||[]).forEach(t=>tagCounts.set(t,(tagCounts.get(t)||0)+1)));
      const tagsSorted=[...tagCounts.entries()].sort((a,b)=>b[1]-a[1]);
      const topType=types[0]&&types[0][0], topColor=colors[0]&&colors[0][0];
      const times=state.votes.map(v=>v.ms||0).filter(x=>x>0);
      const avg=times.length?Math.max(1,Math.round(times.reduce((a,b)=>a+b,0)/times.length/1000)):0;
      const feel0=(state.feel&&state.feel[0]) || tcase(tagsSorted[0]?tagsSorted[0][0]:'Distinctive');
      const archetype=(feel0?feel0+' ':'')+(TYPE_WORD[topType]||'Mark');
      const tagline='You gravitate toward '+(TYPE_DESC[topType]||'distinctive logos')+(topColor?(' with '+topColor.toLowerCase()+' tones'):'')+'.';
      const diverse=types.length>=3 || colors.length>=4;
      const note=diverse?'Your taste is diverse — consider a cohesive brand direction.':'Your taste is focused and consistent.';
      return {liked,passed,types,colors,tagsSorted,topType,topColor,avg,archetype,tagline,note,
        typo:typography(tagCounts, state.feel), swiped:state.votes.length, likedN:liked.length};
    }

    function el(tag,cls,html){ const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
    function section(label, node){ const s=el('div','res-section'); s.append(el('div','res-label',label), node); return s; }
    function bars(rows, max, ranked, swatch){
      const wrap=el('div','bars');
      rows.forEach(([name,count],i)=>{
        const row=el('div','bar-row');
        if(ranked) row.append(el('div','bar-rank', String(i+1)));
        const body=el('div','bar-body');
        const head=el('div','bar-head');
        const nm=el('div','bar-name');
        if(swatch){ const sw=el('span','swatch'); sw.style.background=COLOR_HEX[name]||name; nm.append(sw); }
        nm.append(document.createTextNode(name));
        head.append(nm, el('div','bar-count', count+' liked'));
        const track=el('div','bar-track'); const fill=el('div','bar-fill'); fill.style.width=Math.round(count/max*100)+'%'; track.append(fill);
        body.append(head, track); row.append(body); wrap.append(row);
      });
      return wrap;
    }

    function render(){
      const p=build();
      document.getElementById('resClient').textContent=state.client||'Untitled brand';
      const body=document.getElementById('resBody'); body.innerHTML='';

      // hero
      const hero=el('div','res-hero');
      hero.append(el('span','res-badge','Style Archetype'), el('h2','res-archetype',p.archetype), el('p','res-tagline',p.tagline), el('span','res-note',p.note));
      body.append(hero);

      // positioning
      const answered=SCALE_OPTIONS.filter(([l,r])=>state.scales && state.scales[l+'–'+r]!=null);
      if(answered.length){
        const panel=el('div','scales');
        answered.forEach(([l,r])=>{
          const v=state.scales[l+'–'+r];
          const row=el('div','scale'); row.append(el('div','scale-end left',l));
          const dots=el('div','scale-dots');
          for(let i=0;i<5;i++){ const d=el('div','dot'+(i===v?' on':'')); dots.append(d); }
          row.append(dots, el('div','scale-end right',r)); panel.append(row);
        });
        body.append(section('Brand positioning', panel));
      }

      // personality
      if(state.feel && state.feel.length){
        const chips=el('div','res-chips');
        state.feel.forEach(n=>{ chips.append(el('span','res-chip','<span class="chip-emoji">'+(FEEL_EMOJI[n]||'')+'</span>'+n)); });
        body.append(section('Brand personality', chips));
      }

      // logo styles + colour palette (two columns)
      const cols=el('div','res-cols');
      const maxType=p.types.length?p.types[0][1]:1;
      const left=el('div'); left.append(el('div','res-label','Preferred logo styles'), bars(p.types, maxType, true, false));
      const maxColor=p.colors.length?p.colors[0][1]:1;
      const right=el('div'); right.append(el('div','res-label','Colour palette direction'), bars(p.colors, maxColor, false, true));
      cols.append(left,right); const colsWrap=el('div','res-section'); colsWrap.append(cols); body.append(colsWrap);

      // typography
      const typo=el('div','res-panel'); typo.append(el('div','typo-name',p.typo.name), el('div','typo-refs','Reference typefaces: '+p.typo.refs));
      body.append(section('Typography direction', typo));

      // stats
      const stats=el('div','res-stats');
      stats.append(stat(p.swiped,'Swiped'), stat(p.likedN,'Liked',true), stat(p.avg+'s','Avg. decision'));
      const statsWrap=el('div','res-section'); statsWrap.append(stats); body.append(statsWrap);

      // top picks
      const picks=(state.top3&&state.top3.length)?state.top3:p.liked.slice(0,3);
      if(picks.length) body.append(section('Top picks', cards(picks, false)));

      // styles to avoid
      const avoid=(state.neverUse&&state.neverUse.length)?state.neverUse:p.passed.slice(0,3);
      if(avoid.length) body.append(section('Styles to avoid', cards(avoid, true)));

      // admired / competitors
      if(state.admire || state.avoid){
        const tc=el('div','res-text-cols');
        tc.append(textPanel('Admired brands', state.admire||'—'), textPanel('Competitors to avoid', state.avoid||'—'));
        const tcWrap=el('div','res-section'); tcWrap.append(tc); body.append(tcWrap);
      }
      if(state.notes){ body.append(section('Notes', el('div','res-panel','<div class="typo-refs" style="color:var(--white)">'+escapeHtml(state.notes)+'</div>'))); }

      // visual clusters
      if(p.types.length){
        const wrap=el('div','clusters');
        p.types.forEach(([type,count])=>{
          const pct=Math.round(count/p.likedN*100);
          const c=el('div','cluster');
          const head=el('div','cluster-head'); head.append(el('div','cluster-name',type), el('div','cluster-meta',count+(count===1?' logo':' logos')+' · '+pct+'%'));
          c.append(head, el('div','cluster-desc', TYPE_BLURB[type]||''));
          const logos=el('div','cluster-logos');
          p.liked.filter(m=>m.type===type).forEach(m=>logos.append(markTile(m)));
          c.append(logos); wrap.append(c);
        });
        body.append(section('Visual clusters', wrap));
      }

      _profile=p;
    }

    function stat(num,label,good){ const s=el('div','stat'); s.append(el('div','stat-num'+(good?' good':''),String(num)), el('div','stat-label',label)); return s; }
    function cards(marks, avoid){
      const g=el('div','res-cards');
      marks.forEach((m,i)=>{ const c=el('div','res-card'+(avoid?' avoid':'')); if(!avoid) c.append(el('div','res-rank',String(i+1))); const t=markTile(m); c.append(t, el('div','res-card-name',m.name)); g.append(c); });
      return g;
    }
    function textPanel(label,val){ const p=el('div','res-text-panel'); p.append(el('div','res-label',label), el('div','v',escapeHtml(val))); return p; }
    function escapeHtml(s){ return (s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

    let _profile=null;
    function briefText(){
      const p=_profile||build();
      const L=[];
      L.push('BRAND STYLE PROFILE — '+(state.client||'Untitled brand'));
      L.push('');
      L.push('STYLE ARCHETYPE: '+p.archetype);
      L.push(p.tagline);
      L.push(p.note);
      const answered=SCALE_OPTIONS.filter(([l,r])=>state.scales && state.scales[l+'–'+r]!=null);
      if(answered.length){ L.push(''); L.push('BRAND POSITIONING');
        const POS=['strongly ','leans ','balanced','leans ','strongly '];
        answered.forEach(([l,r])=>{ const v=state.scales[l+'–'+r]; const t=v===2?'balanced':(POS[v]+(v<2?l:r)); L.push('- '+l+' ↔ '+r+': '+t); });
      }
      if(state.feel&&state.feel.length){ L.push(''); L.push('BRAND PERSONALITY: '+state.feel.join(', ')); }
      if(p.types.length){ L.push(''); L.push('PREFERRED LOGO STYLES'); p.types.forEach(([t,c],i)=>L.push((i+1)+'. '+t+' — '+c+' liked')); }
      if(p.colors.length){ L.push(''); L.push('COLOUR PALETTE DIRECTION'); p.colors.forEach(([t,c])=>L.push('- '+t+' — '+c+' liked')); }
      L.push(''); L.push('TYPOGRAPHY DIRECTION'); L.push(p.typo.name); L.push('Reference typefaces: '+p.typo.refs);
      L.push(''); L.push('SESSION: '+p.swiped+' swiped · '+p.likedN+' liked · '+p.avg+'s avg decision');
      const picks=(state.top3&&state.top3.length)?state.top3:p.liked.slice(0,3);
      if(picks.length){ L.push(''); L.push('TOP PICKS'); picks.forEach((m,i)=>L.push((i+1)+'. '+m.name)); }
      const avoid=(state.neverUse&&state.neverUse.length)?state.neverUse:p.passed.slice(0,3);
      if(avoid.length){ L.push(''); L.push('STYLES TO AVOID'); avoid.forEach(m=>L.push('- '+m.name)); }
      if(state.admire){ L.push(''); L.push('ADMIRED BRANDS: '+state.admire); }
      if(state.avoid){ L.push('COMPETITORS TO AVOID: '+state.avoid); }
      if(state.notes){ L.push(''); L.push('NOTES: '+state.notes); }
      return L.join('\n');
    }
    async function copyBrief(btn){
      const text=briefText();
      let ok=false;
      try{ await navigator.clipboard.writeText(text); ok=true; }
      catch(e){ try{ const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); ok=document.execCommand('copy'); ta.remove(); }catch(_){ ok=false; } }
      const label=btn.querySelector('.res-copy-label');
      if(label){ const prev=label.textContent; label.textContent=ok?'Copied!':'Press ⌘C'; setTimeout(()=>label.textContent=prev,1800); }
      flash(ok?'Brand brief copied to clipboard':'Could not copy — selecting text instead');
    }

    function init(){
      const btn=document.getElementById('copyBrief');
      if(btn) btn.addEventListener('click',()=>copyBrief(btn));
    }
    return { render, init };
  })();
  Results.init();

  window.brandDnaState = state;
