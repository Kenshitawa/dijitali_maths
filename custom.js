/**
 * DIJITALI MATHS — Global Interactive Scripts
 * "Every learner can do maths. Sometimes they just need the right way in."
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileDrawer();
  initAnimatedCounters();
  initMathChallengeWidget();
  initGalleryFilter();
  initEventsFilter();
  initModals();
  initFaqAccordion();
  initFormsAndToasts();
  initHeroSlideshow();
});

/* ==========================================================================
   1. NAVBAR SCROLL EFFECT
   ========================================================================== */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const handleScroll = () => {
    if (window.scrollY > 30) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* ==========================================================================
   2. MOBILE DRAWER NAVIGATION
   ========================================================================== */
function initMobileDrawer() {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  const overlay = document.querySelector('.drawer-overlay');
  const closeBtn = document.querySelector('.drawer-close');

  if (!toggleBtn || !drawer || !overlay) return;

  const openDrawer = () => {
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Close when clicking any nav link in drawer
  const drawerLinks = drawer.querySelectorAll('a');
  drawerLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });
}

/* ==========================================================================
   3. ANIMATED IMPACT COUNTERS
   ========================================================================== */
function initAnimatedCounters() {
  const counters = document.querySelectorAll('.stat-counter');
  if (!counters.length) return;

  const runCounter = (el) => {
    const target = parseInt(el.getAttribute('data-target'), 10);
    const duration = 2000;
    const stepTime = 25;
    const totalSteps = duration / stepTime;
    const increment = target / totalSteps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        el.textContent = target.toLocaleString() + (el.getAttribute('data-suffix') || '');
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(current).toLocaleString() + (el.getAttribute('data-suffix') || '');
      }
    }, stepTime);
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        runCounter(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  counters.forEach(c => observer.observe(c));
}

/* ==========================================================================
   4. INTERACTIVE MATHS CHALLENGE WIDGET (26+ CREATIVE CHALLENGES)
   ========================================================================== */
function initMathChallengeWidget() {
  const challengeBoxes = document.querySelectorAll('.math-challenge-box');
  if (!challengeBoxes.length) return;

  const challenges = [
    {
      category: "🍎 Fruit Equation Puzzle",
      q: "🍎 + 🍎 + 🍎 = 30<br>🍎 + 🍌 + 🍌 = 18<br>🍌 - 🍇 = 2<br><span class=\"math-equation\">What is 🍎 + 🍌 × 🍇 ?</span>",
      options: [
        { text: "A) 18", correct: true, note: "🎯 Genius! 🍎=10, 🍌=4, 🍇=2. Multiplication comes first: 4 × 2 = 8, then 10 + 8 = 18!" },
        { text: "B) 34", correct: false, note: "Almost! Remember order of operations (BODMAS / PEMDAS): multiply 🍌 × 🍇 before adding 🍎." },
        { text: "C) 28", correct: false, note: "Check the fruit values: 🍎 = 10, 🍌 = 4, 🍇 = 2." },
        { text: "D) 22", correct: false, note: "Try calculating: 10 + (4 × 2)." }
      ]
    },
    {
      category: "📿 Binary Necklace Code",
      q: "In our Dijitali Workshop, black beads = 1 and white beads = 0.<br><span class=\"math-equation\">⚫ ⚪ ⚫ ⚫ &nbsp; (Binary: 1 0 1 1₂)</span><br>What decimal number does this necklace represent?",
      options: [
        { text: "A) 11", correct: true, note: "🌟 Outstanding! (1×8) + (0×4) + (1×2) + (1×1) = 8 + 0 + 2 + 1 = 11! You cracked the binary necklace code!" },
        { text: "B) 7", correct: false, note: "Check place values: [8s] [4s] [2s] [1s]." },
        { text: "C) 13", correct: false, note: "In binary, the positions are 8, 4, 2, 1. (8 + 0 + 2 + 1 = 11)." },
        { text: "D) 9", correct: false, note: "Close! Don't forget the 2s place: 8 + 2 + 1 = 11." }
      ]
    },
    {
      category: "🍕 Pizza Fraction Feast",
      q: "4 friends order 3 large pizzas. Each pizza is cut into 8 equal slices (24 slices total).<br><span class=\"math-equation\">24 slices ÷ 4 friends = ❓</span><br>How many slices does each friend get, and what fraction of a pizza is that?",
      options: [
        { text: "A) 6 slices (3/4 of a pizza)", correct: true, note: "🍕 Deliciously correct! 24 ÷ 4 = 6 slices each, which equals 6/8 = 3/4 of a whole pizza!" },
        { text: "B) 4 slices (1/2 of a pizza)", correct: false, note: "Check total slices: 3 pizzas × 8 slices = 24. 24 ÷ 4 = 6!" },
        { text: "C) 8 slices (1 whole pizza)", correct: false, note: "That would need 4 whole pizzas (32 slices)." },
        { text: "D) 5 slices (5/8 of a pizza)", correct: false, note: "Almost! 24 divided equally by 4 gives 6." }
      ]
    },
    {
      category: "☕ Dijitali Counting Cups Lab",
      q: "Teacher Brenda has 4 blue cups holding 5 counters each, and 3 yellow cups holding 10 counters each.<br><span class=\"math-equation\">(4 × 5) + (3 × 10) = ❓</span><br>How many counters are there in total?",
      options: [
        { text: "A) 50 counters", correct: true, note: "🎉 Spot on! 20 + 30 = 50 counters! Reusable counting cups turn abstract multiplication into physical models!" },
        { text: "B) 35 counters", correct: false, note: "4 × 5 = 20, and 3 × 10 = 30. Now add them together!" },
        { text: "C) 45 counters", correct: false, note: "Check the yellow cups: 3 × 10 = 30." },
        { text: "D) 60 counters", correct: false, note: "Recount the blue cups: 4 × 5 = 20." }
      ]
    },
    {
      category: "🧩 Growing Shapes Pattern",
      q: "Look at the growing shapes sequence:<br><span class=\"math-equation\">Step 1: 🔺 &nbsp; ➜ &nbsp; Step 2: 🔺🔷 &nbsp; ➜ &nbsp; Step 3: 🔺🔷🔷</span><br>How many total shapes (triangles + diamonds) will be in <strong>Step 6</strong>?",
      options: [
        { text: "A) 6 shapes (1 🔺 + 5 🔷)", correct: true, note: "🎯 Perfect pattern deduction! Step n has 1 triangle and (n-1) diamonds, making 6 total shapes in Step 6!" },
        { text: "B) 5 shapes", correct: false, note: "Step 6 adds 5 diamonds plus the 1 starting triangle!" },
        { text: "C) 7 shapes", correct: false, note: "Count total shapes: Step 1 = 1, Step 2 = 2, Step 3 = 3... Step 6 = 6!" },
        { text: "D) 8 shapes", correct: false, note: "Step 6 has 6 total shapes." }
      ]
    },
    {
      category: "🎲 Dice Probability",
      q: "When rolling two standard dice 🎲🎲 (from 1 to 6 on each die),<br><span class=\"math-equation\">Which sum (2 to 12) has the HIGHEST probability of appearing?</span>",
      options: [
        { text: "A) Sum of 7", correct: true, note: "🎲 Bingo! There are 6 combinations that add up to 7 (1+6, 2+5, 3+4, 4+3, 5+2, 6+1)—more than any other sum!" },
        { text: "B) Sum of 6", correct: false, note: "Sum of 6 has 5 ways, but sum of 7 has 6 ways!" },
        { text: "C) Sum of 12", correct: false, note: "Sum of 12 only has 1 combination: (6+6)." },
        { text: "D) Sum of 8", correct: false, note: "Sum of 8 has 5 combinations (2+6, 3+5, 4+4, 5+3, 6+2)." }
      ]
    },
    {
      category: "🇰🇪 Kenya Shilling Market Math",
      q: "At the school math festival, 1 geometry set costs KES 150. A student buys 4 geometry sets and pays with a KES 1,000 note.<br><span class=\"math-equation\">KES 1,000 - (4 × KES 150) = ❓</span><br>How much change should they receive?",
      options: [
        { text: "A) KES 400", correct: true, note: "💰 Sharp accountant! 4 × KES 150 = KES 600. KES 1,000 - KES 600 = KES 400 change!" },
        { text: "B) KES 450", correct: false, note: "4 × 150 = 600. 1000 - 600 = 400." },
        { text: "C) KES 350", correct: false, note: "Almost! Check 1000 minus 600." },
        { text: "D) KES 500", correct: false, note: "Remember they bought 4 sets, not 3!" }
      ]
    },
    {
      category: "🥢 Matchstick Geometry",
      q: "It takes 3 matchsticks to build 1 standalone triangle: 🔺.<br><span class=\"math-equation\">🔺🔺 (2 connected triangles sharing 1 common side)</span><br>How many matchsticks are needed in total?",
      options: [
        { text: "A) 5 matchsticks", correct: true, note: "✨ Brilliant spatial insight! 3 sticks for the first triangle + 2 more attached to the shared edge = 5 sticks!" },
        { text: "B) 6 matchsticks", correct: false, note: "If they share 1 wall/side, you save 1 stick: 3 + 2 = 5!" },
        { text: "C) 4 matchsticks", correct: false, note: "You need at least 5 matchsticks to form 2 full triangles." },
        { text: "D) 7 matchsticks", correct: false, note: "5 sticks is enough when sharing an edge!" }
      ]
    },
    {
      category: "⚡ Speed Mental Math Trick",
      q: "Magic trick: To multiply any 2-digit number by 11 (like 43 × 11), add the digits (4+3=7) and place in the center (473).<br><span class=\"math-equation\">Using this trick, what is 52 × 11 ?</span>",
      options: [
        { text: "A) 572", correct: true, note: "🚀 Lightning fast! 5 + 2 = 7, inserted between 5 and 2 gives 572! Mental math shortcuts build speed & confidence!" },
        { text: "B) 520", correct: false, note: "Add the digits 5 + 2 = 7 and place between: 572." },
        { text: "C) 582", correct: false, note: "5 + 2 = 7, so the middle digit is 7." },
        { text: "D) 562", correct: false, note: "5 + 2 = 7, resulting in 572." }
      ]
    },
    {
      category: "⚖️ The Balance Scale Riddle",
      q: "On a balanced balance scale:<br><span class=\"math-equation\">2 🟩 (Cubes) = 6 🟡 (Marbles)<br>1 🔺 (Pyramid) = 1 🟩 (Cube) + 1 🟡 (Marble)</span><br>How many marbles balance 1 🔺 (Pyramid)?",
      options: [
        { text: "A) 4 marbles", correct: true, note: "⚖️ Master logician! Since 2 cubes = 6 marbles, 1 cube = 3 marbles. 1 pyramid = 3 + 1 = 4 marbles!" },
        { text: "B) 3 marbles", correct: false, note: "1 cube alone equals 3 marbles. Add the 1 extra marble for the pyramid = 4." },
        { text: "C) 5 marbles", correct: false, note: "1 cube (3) + 1 marble (1) = 4." },
        { text: "D) 2 marbles", correct: false, note: "A pyramid is heavier than a single cube." }
      ]
    },
    {
      category: "🌀 Nature's Fibonacci Spiral",
      q: "Look at the famous Fibonacci spiral sequence found in sunflower seeds and pinecones:<br><span class=\"math-equation\">1, 1, 2, 3, 5, 8, 13, 21, ___ ?</span><br>What is the next number?",
      options: [
        { text: "A) 34", correct: true, note: "🌻 Nature's harmony! Each number is the sum of the previous two: 13 + 21 = 34!" },
        { text: "B) 29", correct: false, note: "Add the last two numbers: 13 + 21 = 34." },
        { text: "C) 31", correct: false, note: "Each term equals the sum of the 2 preceding terms: 13 + 21 = 34." },
        { text: "D) 35", correct: false, note: "13 + 21 = 34." }
      ]
    },
    {
      category: "⏱️ Analog Clock Angles",
      q: "Look at an analog clock face at exactly 3:00 🕒.<br><span class=\"math-equation\">Minute hand on 12 &nbsp;|&nbsp; Hour hand on 3</span><br>What is the angle between the two hands?",
      options: [
        { text: "A) 90° (Right Angle)", correct: true, note: "📐 Exactly right! A clock is 360° with 12 hours (30° per hour). At 3:00, 3 × 30° = 90° (a right angle)!" },
        { text: "B) 60° (Acute)", correct: false, note: "Each hour represents 30°. At 3:00 that is 3 × 30° = 90°." },
        { text: "C) 120° (Obtuse)", correct: false, note: "120° would be at 4:00." },
        { text: "D) 45°", correct: false, note: "45° would be halfway between numbers." }
      ]
    },
    {
      category: "🐔 Farmyard Legs Algebra",
      q: "In a farm in Nakuru, there are only Chickens 🐔 (2 legs) and Sheep 🐑 (4 legs).<br><span class=\"math-equation\">Total Heads = 6 &nbsp;|&nbsp; Total Legs = 16</span><br>How many sheep are there?",
      options: [
        { text: "A) 2 sheep (and 4 chickens)", correct: true, note: "🐑 Stellar deduction! 2 sheep have 8 legs + 4 chickens have 8 legs = 16 legs & 6 heads!" },
        { text: "B) 3 sheep", correct: false, note: "3 sheep (12 legs) + 3 chickens (6 legs) = 18 legs (too many)." },
        { text: "C) 4 sheep", correct: false, note: "4 sheep (16 legs) + 2 chickens (4 legs) = 20 legs." },
        { text: "D) 1 sheep", correct: false, note: "1 sheep (4 legs) + 5 chickens (10 legs) = 14 legs." }
      ]
    },
    {
      category: "🔐 Secret Math Safe Combination",
      q: "A 3-digit safe code [ A ][ B ][ C ] has these clues:<br>• A + B + C = 15<br>• All 3 digits are distinct odd numbers<br>• A is the smallest odd prime (3)<br>• C is larger than B<br><span class=\"math-equation\">What is the safe combination?</span>",
      options: [
        { text: "A) 357", correct: true, note: "🔓 Click! The safe opens! 3 + 5 + 7 = 15, all are odd and distinct, A=3, and 7 > 5!" },
        { text: "B) 339", correct: false, note: "All digits must be distinct (no repeating 3s)." },
        { text: "C) 159", correct: false, note: "A must be 3 (the smallest odd prime, since 1 is not prime)." },
        { text: "D) 348", correct: false, note: "4 and 8 are even numbers!" }
      ]
    },
    {
      category: "🧱 3D Cubic Volume",
      q: "A rectangular storage box is 5 cm long, 4 cm wide, and 3 cm high.<br><span class=\"math-equation\">Volume = Length × Width × Height</span><br>How many 1-cm cubic blocks fit inside it completely?",
      options: [
        { text: "A) 60 blocks", correct: true, note: "📦 Spot on! 5 × 4 × 3 = 60 cubic centimeters! Hands-on spatial thinking makes geometry intuitive!" },
        { text: "B) 24 blocks", correct: false, note: "5 × 4 = 20; 20 × 3 = 60." },
        { text: "C) 48 blocks", correct: false, note: "Multiply all 3 dimensions: 5 × 4 × 3 = 60." },
        { text: "D) 12 blocks", correct: false, note: "5 + 4 + 3 is addition, but volume is multiplication!" }
      ]
    },
    {
      category: "🪄 3x3 Magic Square Mystery",
      q: "In a classic 3×3 magic square using the numbers 1 to 9, every row, column, and diagonal sums to 15.<br><span class=\"math-equation\">Which number MUST be placed in the center cell?</span>",
      options: [
        { text: "A) 5", correct: true, note: "🪄 Mathematical magic! The center is always the median/average of 1 to 9, which is 5!" },
        { text: "B) 1", correct: false, note: "1 is at an edge position in the magic square." },
        { text: "C) 9", correct: false, note: "9 is at an outer cell." },
        { text: "D) 7", correct: false, note: "Only 5 can balance all 4 intersecting lines (row, column, and 2 diagonals)." }
      ]
    },
    {
      category: "🏎️ Speed, Distance & Time",
      q: "A bus travels from Nairobi towards Nakuru (160 km) at a steady speed of 80 km/h.<br><span class=\"math-equation\">Time = Distance ÷ Speed = 160 ÷ 80</span><br>How long does the journey take?",
      options: [
        { text: "A) 2 hours", correct: true, note: "🚦 Smooth journey! 160 km ÷ 80 km/h = 2 hours! Mathematics governs motion and travel!" },
        { text: "B) 1.5 hours", correct: false, note: "80 km in 1 hr + 80 km in 2nd hr = 160 km in 2 hours." },
        { text: "C) 2.5 hours", correct: false, note: "160 divided by 80 is exactly 2." },
        { text: "D) 3 hours", correct: false, note: "At 80 km/h, 3 hours would cover 240 km." }
      ]
    },
    {
      category: "🎈 Carnival Balloon Logic",
      q: "Red balloons 🎈 cost KES 20 each. Blue balloons 🎈 cost KES 30 each. Amani buys a mix of 6 balloons and spends KES 140.<br><span class=\"math-equation\">(? × 30) + (? × 20) = KES 140</span><br>How many blue balloons did Amani buy?",
      options: [
        { text: "A) 2 blue balloons (and 4 red)", correct: true, note: "🎉 High-five! 2 blue (KES 60) + 4 red (KES 80) = KES 140 for 6 balloons!" },
        { text: "B) 3 blue balloons", correct: false, note: "3 blue (90) + 3 red (60) = 150 (exceeds 140)." },
        { text: "C) 1 blue balloon", correct: false, note: "1 blue (30) + 5 red (100) = 130 (less than 140)." },
        { text: "D) 4 blue balloons", correct: false, note: "4 blue (120) + 2 red (40) = 160." }
      ]
    },
    {
      category: "🍰 Fractional Sharing",
      q: "You have 1/2 of a cake left over. If you divide that remaining half equally among 3 siblings,<br><span class=\"math-equation\">1/2 ÷ 3 = ❓</span><br>What fraction of the original whole cake does each sibling receive?",
      options: [
        { text: "A) 1/6 of the cake", correct: true, note: "🍰 Perfect fractional slice! 1/2 ÷ 3 = 1/6 of the entire cake!" },
        { text: "B) 1/5 of the cake", correct: false, note: "Multiply the denominators: 2 × 3 = 6, so 1/6." },
        { text: "C) 1/3 of the cake", correct: false, note: "1/3 would be sharing a whole cake among 3." },
        { text: "D) 2/3 of the cake", correct: false, note: "When dividing a fraction into pieces, each piece gets smaller!" }
      ]
    },
    {
      category: "🔢 Prime Number Detective",
      q: "A prime number has exactly two distinct factors: 1 and itself.<br><span class=\"math-equation\">21, &nbsp; 27, &nbsp; 29, &nbsp; 33</span><br>Which number in this list is PRIME?",
      options: [
        { text: "A) 29", correct: true, note: "🔍 Ace detective! 29 cannot be divided evenly by any number other than 1 and 29!" },
        { text: "B) 27", correct: false, note: "27 is divisible by 3 and 9 (3 × 9 = 27)." },
        { text: "C) 21", correct: false, note: "21 is divisible by 3 and 7 (3 × 7 = 21)." },
        { text: "D) 33", correct: false, note: "33 is divisible by 3 and 11 (3 × 11 = 33)." }
      ]
    },
    {
      category: "📐 Triangle Angle Sum Theorem",
      q: "In flat Euclidean geometry, what is the exact sum of all 3 interior angles of ANY triangle 🔺?<br><span class=\"math-equation\">Angle A + Angle B + Angle C = ❓</span>",
      options: [
        { text: "A) 180°", correct: true, note: "📐 Universal mathematical truth! The three interior angles of any planar triangle always add up to 180°!" },
        { text: "B) 360°", correct: false, note: "360° is the sum of angles in a quadrilateral (4-sided polygon)." },
        { text: "C) 90°", correct: false, note: "90° is just one right angle." },
        { text: "D) 270°", correct: false, note: "The sum is always 180°." }
      ]
    },
    {
      category: "🍫 Chocolate Grid Division",
      q: "A chocolate bar is divided into a 4 × 6 grid (24 pieces total).<br><span class=\"math-equation\">24 pieces ÷ 6 children = ❓</span><br>How many pieces does each child get?",
      options: [
        { text: "A) 4 pieces each", correct: true, note: "🍫 Sweet math! 24 ÷ 6 = 4 pieces for each child!" },
        { text: "B) 6 pieces each", correct: false, note: "6 × 6 = 36 pieces needed." },
        { text: "C) 3 pieces each", correct: false, note: "3 × 6 = 18 pieces." },
        { text: "D) 5 pieces each", correct: false, note: "5 × 6 = 30 pieces." }
      ]
    },
    {
      category: "🌾 Exponential Growth (Powers of 2)",
      q: "If you place 1 grain of rice on day 1 and double it every day (1 ➜ 2 ➜ 4 ➜ 8 ➜ 16...):<br><span class=\"math-equation\">Day 1: 1 &nbsp;|&nbsp; Day 2: 2 &nbsp;|&nbsp; Day 3: 4 ... Day 7: 2⁶ = ❓</span><br>How many grains of rice on Day 7?",
      options: [
        { text: "A) 64 grains", correct: true, note: "🌾 Exponential power! Day 1: 1, D2: 2, D3: 4, D4: 8, D5: 16, D6: 32, Day 7: 64 grains!" },
        { text: "B) 128 grains", correct: false, note: "128 grains would be on Day 8 (2⁷)." },
        { text: "C) 49 grains", correct: false, note: "Doubling is powers of 2, not 7 squared!" },
        { text: "D) 32 grains", correct: false, note: "32 grains is Day 6." }
      ]
    },
    {
      category: "🤝 Handshake Combinatorics",
      q: "5 Dijitali Maths club members meet. If every person shakes hands with every other person exactly once:<br><span class=\"math-equation\">Total Handshakes = [ 5 × (5 - 1) ] ÷ 2 = ❓</span>",
      options: [
        { text: "A) 10 handshakes", correct: true, note: "🤝 Brilliant combinatorics! 5 × 4 ÷ 2 = 10 handshakes! Everyone connects!" },
        { text: "B) 20 handshakes", correct: false, note: "20 is before dividing by 2 (since each handshake involves 2 people)." },
        { text: "C) 15 handshakes", correct: false, note: "The formula is n(n-1)/2 = 5×4/2 = 10." },
        { text: "D) 25 handshakes", correct: false, note: "You don't shake hands with yourself!" }
      ]
    },
    {
      category: "🚀 Alpha-Numeric Secret Cipher",
      q: "In cryptography, letters match numbers (A=1, B=2, C=3, ... M=13, A=1, T=20, H=8).<br><span class=\"math-equation\">13 - 1 - 20 - 8 = ❓</span><br>What inspiring word does this secret number code spell?",
      options: [
        { text: "A) MATH", correct: true, note: "🌟 MATH IS MAGIC! M(13) - A(1) - T(20) - H(8). You are officially a Dijitali Mastermind!" },
        { text: "B) MIND", correct: false, note: "D is 4, but the last number is 8 (H)." },
        { text: "C) GAME", correct: false, note: "G is 7, but the first number is 13 (M)." },
        { text: "D) STAR", correct: false, note: "S is 19." }
      ]
    },
    {
      category: "📊 Proportion & Scaling Lab",
      q: "If 3 students build 12 counting cups in 30 minutes, working at the same pace:<br><span class=\"math-equation\">How many cups can 6 students build in 30 minutes?</span>",
      options: [
        { text: "A) 24 cups", correct: true, note: "🎯 Direct proportion master! Double the students (×2) = double the completed cups (12 × 2 = 24)!" },
        { text: "B) 18 cups", correct: false, note: "Since the group doubled from 3 to 6, output doubles from 12 to 24." },
        { text: "C) 36 cups", correct: false, note: "36 would be 3 times the original group (9 students)." },
        { text: "D) 15 cups", correct: false, note: "Each student builds 4 cups. 6 × 4 = 24 cups." }
      ]
    }
  ];

  let currentIdx = 0;
  let streak = 0;

  challengeBoxes.forEach(box => {
    const renderChallenge = (idx) => {
      const item = challenges[idx];
      const qEl = box.querySelector('.challenge-q-text');
      const optContainer = box.querySelector('.challenge-options');
      const feedbackEl = box.querySelector('.challenge-feedback');

      // Update meta header tags if present or create them
      let metaRow = box.querySelector('.challenge-meta-row');
      if (!metaRow) {
        metaRow = document.createElement('div');
        metaRow.className = 'challenge-meta-row';
        if (qEl && qEl.parentNode) {
          qEl.parentNode.insertBefore(metaRow, qEl);
        }
      }

      metaRow.innerHTML = `
        <span class="challenge-counter-badge"><i class="fa-solid fa-gamepad"></i> Challenge ${idx + 1} of ${challenges.length}</span>
        <span class="challenge-category-badge"><i class="fa-solid fa-tag"></i> ${item.category}</span>
        <span class="challenge-streak-badge"><i class="fa-solid fa-fire"></i> Streak: ${streak}</span>
      `;

      if (qEl) qEl.innerHTML = item.q;
      if (feedbackEl) {
        feedbackEl.className = 'challenge-feedback';
        feedbackEl.textContent = '';
        feedbackEl.style.opacity = '0';
      }

      if (optContainer) {
        optContainer.innerHTML = '';
        item.options.forEach(opt => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'challenge-opt-btn';
          btn.innerHTML = `<i class="fa-regular fa-circle-dot"></i> <span>${opt.text}</span>`;
          btn.addEventListener('click', () => {
            // Disable all options in this round
            const allBtns = optContainer.querySelectorAll('.challenge-opt-btn');
            allBtns.forEach(b => b.disabled = true);

            if (opt.correct) {
              streak++;
              btn.classList.add('correct');
              btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${opt.text}</span>`;
              feedbackEl.className = 'challenge-feedback show';
              feedbackEl.style.color = '#34d399';
              feedbackEl.style.background = 'rgba(16, 185, 129, 0.2)';
              feedbackEl.style.border = '1px solid rgba(16, 185, 129, 0.4)';
              feedbackEl.style.opacity = '1';
              feedbackEl.innerHTML = `<i class="fa-solid fa-circle-check" style="font-size:1.3rem;"></i> <span>${opt.note}</span>`;
              showToast(`🎉 Correct! Streak is now ${streak}!`);
            } else {
              streak = 0;
              btn.classList.add('wrong');
              btn.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>${opt.text}</span>`;
              feedbackEl.className = 'challenge-feedback show';
              feedbackEl.style.color = '#f87171';
              feedbackEl.style.background = 'rgba(244, 63, 94, 0.2)';
              feedbackEl.style.border = '1px solid rgba(244, 63, 94, 0.4)';
              feedbackEl.style.opacity = '1';
              feedbackEl.innerHTML = `<i class="fa-solid fa-circle-xmark" style="font-size:1.3rem;"></i> <span>${opt.note}</span>`;
            }

            // Update streak in UI
            const streakBadge = box.querySelector('.challenge-streak-badge');
            if (streakBadge) streakBadge.innerHTML = `<i class="fa-solid fa-fire"></i> Streak: ${streak}`;
          });
          optContainer.appendChild(btn);
        });
      }
    };

    renderChallenge(0);

    const nextBtn = box.querySelector('.next-challenge-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentIdx = (currentIdx + 1) % challenges.length;
        renderChallenge(currentIdx);
      });
    }
  });
}

/* ==========================================================================
   5. GALLERY FILTER ENGINE & LIGHTBOX
   ========================================================================== */
function initGalleryFilter() {
  const filterBtns = document.querySelectorAll('.gallery-filter-btn');
  const items = document.querySelectorAll('.gallery-item');

  if (!filterBtns.length || !items.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      items.forEach(item => {
        const category = item.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          item.style.display = 'block';
          item.style.opacity = '1';
          item.style.transform = 'scale(1)';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // Lightbox Modal for Gallery items
  const lightboxModal = document.getElementById('lightboxModal');
  if (lightboxModal) {
    const lbImg = lightboxModal.querySelector('.lightbox-img');
    const lbCaption = lightboxModal.querySelector('.lightbox-caption');
    const lbClose = lightboxModal.querySelector('.modal-close');
    const lbBackdrop = lightboxModal.querySelector('.modal-backdrop');

    items.forEach(item => {
      item.addEventListener('click', () => {
        const img = item.querySelector('img');
        const capTitle = item.querySelector('h4') ? item.querySelector('h4').textContent : '';
        const capSub = item.querySelector('p') ? item.querySelector('p').textContent : '';

        if (img && lbImg) lbImg.src = img.src;
        if (lbCaption) lbCaption.innerHTML = `<strong>${capTitle}</strong><br><small style="color:#94a3b8">${capSub}</small>`;

        lightboxModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    const closeLb = () => {
      lightboxModal.classList.remove('active');
      document.body.style.overflow = '';
    };

    if (lbClose) lbClose.addEventListener('click', closeLb);
    if (lbBackdrop) lbBackdrop.addEventListener('click', closeLb);
  }
}

/* ==========================================================================
   6. EVENTS FILTER & REGISTRATION MODAL
   ========================================================================== */
function initEventsFilter() {
  const filterBtns = document.querySelectorAll('.event-filter-btn');
  const eventCards = document.querySelectorAll('.event-card-item');

  if (filterBtns.length && eventCards.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter');

        eventCards.forEach(card => {
          const category = card.getAttribute('data-category');
          if (filter === 'all' || category === filter) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // Event Register Trigger
  const registerBtns = document.querySelectorAll('.register-event-btn');
  const eventModal = document.getElementById('eventRegisterModal');

  if (registerBtns.length && eventModal) {
    const eventNameInput = eventModal.querySelector('#modalEventName');
    const modalClose = eventModal.querySelector('.modal-close');
    const modalBackdrop = eventModal.querySelector('.modal-backdrop');

    registerBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const eventTitle = btn.getAttribute('data-event') || 'Dijitali Maths Session';
        if (eventNameInput) eventNameInput.value = eventTitle;
        eventModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    const closeModal = () => {
      eventModal.classList.remove('active');
      document.body.style.overflow = '';
    };

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);
  }
}

/* ==========================================================================
   7. GENERAL MODALS
   ========================================================================== */
function initModals() {
  const modalTriggers = document.querySelectorAll('[data-modal-target]');

  modalTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-modal-target');
      const targetModal = document.getElementById(targetId);
      if (targetModal) {
        targetModal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  const closeBtns = document.querySelectorAll('.modal-close, .modal-backdrop');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const openModals = document.querySelectorAll('.modal-wrapper.active');
      openModals.forEach(m => m.classList.remove('active'));
      document.body.style.overflow = '';
    });
  });
}

/* ==========================================================================
   8. FAQ ACCORDION
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (question && answer) {
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close other items
        faqItems.forEach(other => {
          other.classList.remove('active');
          const otherAns = other.querySelector('.faq-answer');
          if (otherAns) otherAns.style.maxHeight = null;
        });

        if (!isActive) {
          item.classList.add('active');
          answer.style.maxHeight = answer.scrollHeight + 30 + 'px';
        }
      });
    }
  });
}

/* ==========================================================================
   9. FORMS, VALIDATIONS & TOAST SYSTEM
   ========================================================================== */
function showToast(message, duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid fa-sparkles" style="color: var(--accent-cyan);"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 50);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

function initFormsAndToasts() {
  // Newsletter Form
  const newsletterForms = document.querySelectorAll('.newsletter-form, .footer-newsletter-form');
  newsletterForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (input && input.value.trim()) {
        showToast(`🎉 Thank you for subscribing to Dijitali Maths updates! (${input.value.trim()})`);
        input.value = '';
      }
    });
  });

  // Contact / General Inquiry Form
  const contactForms = document.querySelectorAll('#contactForm, .contact-form-ajax');
  contactForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast("✅ Thank you! Your message has been sent to the Dijitali Maths team. We'll be in touch soon!");
      form.reset();
    });
  });

  // Volunteer Application Form
  const volunteerForm = document.getElementById('volunteerAppForm');
  if (volunteerForm) {
    volunteerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast("🚀 Application received! Welcome to the Dijitali Maths volunteer community. We will follow up via email/phone!");
      volunteerForm.reset();
      // If inside a modal, close after a moment
      setTimeout(() => {
        const parentModal = volunteerForm.closest('.modal-wrapper');
        if (parentModal) parentModal.classList.remove('active');
      }, 1500);
    });
  }

  // Event Registration Modal Form
  const eventRegForm = document.getElementById('eventRegForm');
  if (eventRegForm) {
    eventRegForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast("🎟️ Registration confirmed! We look forward to exploring mathematics with you!");
      eventRegForm.reset();
      const parentModal = document.getElementById('eventRegisterModal');
      if (parentModal) parentModal.classList.remove('active');
    });
  }

  // Partner Form
  const partnerForm = document.getElementById('partnerForm');
  if (partnerForm) {
    partnerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast("🤝 Partnership inquiry received! Thank you for supporting mathematics education in Kenya.");
      partnerForm.reset();
    });
  }
}

/* ==========================================================================
   HERO IMAGE SLIDESHOW
   ========================================================================== */
function initHeroSlideshow() {
  const slideshow = document.getElementById('heroSlideshow');
  if (!slideshow) return;

  const slides = slideshow.querySelectorAll('.hero-slide');
  const dots   = document.querySelectorAll('.slide-dot');
  const prev   = document.getElementById('slidePrev');
  const next   = document.getElementById('slideNext');
  const card   = slideshow.closest('.hero-image-card');

  if (!slides.length) return;

  let current  = 0;
  let timer    = null;
  const DELAY  = 4000;  // ms between auto-advances

  function goTo(idx) {
    // Slide old one out
    slides[current].classList.remove('active');
    slides[current].classList.add('slide-out');
    dots[current] && dots[current].classList.remove('active');

    // After transition remove slide-out so it resets for next time
    const prev = slides[current];
    setTimeout(() => prev.classList.remove('slide-out'), 800);

    current = (idx + slides.length) % slides.length;

    slides[current].classList.add('active');
    dots[current] && dots[current].classList.add('active');
  }

  function startAuto() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), DELAY);
  }

  function stopAuto() {
    clearInterval(timer);
  }

  // Kick off
  startAuto();

  // Arrow controls
  if (next) next.addEventListener('click', () => { goTo(current + 1); startAuto(); });
  if (prev) prev.addEventListener('click', () => { goTo(current - 1); startAuto(); });

  // Dot controls
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      goTo(parseInt(dot.dataset.slide, 10));
      startAuto();
    });
  });

  // Pause on hover
  if (card) {
    card.addEventListener('mouseenter', stopAuto);
    card.addEventListener('mouseleave', startAuto);
  }

  // Touch / swipe support
  let touchStartX = 0;
  slideshow.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  slideshow.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      goTo(dx < 0 ? current + 1 : current - 1);
      startAuto();
    }
  });
}