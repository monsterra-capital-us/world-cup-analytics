import { Card } from "@/components/ui";

/**
 * Technical white paper for the prediction engine. Static, prose-style
 * documentation of every calculation, with the exact constants used in
 * src/lib/model/*. Rendered at the bottom of the Model page.
 */

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3
      id={id}
      className="mt-8 scroll-mt-24 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent"
    >
      {children}
    </h3>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 overflow-x-auto rounded-xl bg-surface-2/70 px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground">
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed text-muted">{children}</p>;
}

export function WhitePaper() {
  return (
    <Card className="px-5 py-5 sm:px-8 sm:py-7">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          Technical white paper
        </p>
        <h2 className="mt-1 text-xl font-bold">
          How the World Cup 2026 forecasts are calculated
        </h2>
        <P>
          Every published number — title odds, a match&apos;s win/draw/win
          split, an expected scoreline — is produced by one deterministic
          pipeline: a team-strength model, a goals model, and a Monte-Carlo
          simulation of the remaining tournament. This paper documents each
          stage and the exact constants in use. The engine is dependency-free
          and lives in <code>src/lib/model/</code>.
        </P>

        {/* ───────────── 1 ───────────── */}
        <H id="ratings">1 · Team strength (Elo)</H>
        <P>
          Each team carries a single scalar strength rating on an Elo scale.
          Every team is seeded with a pre-tournament base rating{" "}
          <code>R₀</code> (calibrated from FIFA ranking, recent results and
          squad quality). The probability that team A beats team B given the
          rating gap is the logistic Elo expectation:
        </P>
        <Formula>E_A = 1 / (1 + 10^((R_B − R_A) / 400))</Formula>
        <P>
          After every recorded match the two teams&apos; ratings move toward
          the realised result. With actual score{" "}
          <code>S ∈ {"{1 win, 0.5 draw, 0 loss}"}</code>:
        </P>
        <Formula>
          R_A ← R_A + K · G(d) · (S_A − E_A)
          <br />
          R_B ← R_B − K · G(d) · (S_A − E_A)
        </Formula>
        <P>
          The update is zero-sum, so total rating is conserved. We use a high
          tournament K-factor <code>K = 50</code> so in-tournament form moves
          the model quickly, and a goal-difference multiplier{" "}
          <code>G(d)</code> that rewards decisive wins (standard World-Football-
          Elo convention), where <code>d</code> is the absolute goal margin:
        </P>
        <Formula>
          G(d) = 1 if d ≤ 1 · 1.5 if d = 2 · (11 + d) / 8 if d ≥ 3
        </Formula>

        {/* ───────────── 2 ───────────── */}
        <H id="injuries">2 · Injury &amp; availability adjustment</H>
        <P>
          Squad news is folded in as a rating penalty rather than a separate
          term, so it flows through every downstream calculation automatically.
          Each flagged player contributes a penalty equal to their{" "}
          <em>importance</em> to the side times a <em>severity</em> for their
          status, scaled to Elo points:
        </P>
        <Formula>
          penalty(team) = min( 160 , Σ_players importance × severity × 65 )
        </Formula>
        <P>
          Importance is a 0–1 weight per key player (a talisman ≈ 0.9–0.95, a
          rotation piece ≈ 0.5; unlisted squad members default to 0.3).
          Severity is <code>1.0</code> for <em>out</em>, <code>0.5</code> for{" "}
          <em>doubtful</em>, and <code>0.25</code> for <em>returning</em> (back
          but short of fitness). One key player ruled out therefore costs up to
          ≈ 62 Elo; the total is capped at <code>160</code> so a long injury
          list can never zero a team out.
        </P>

        {/* ───────────── 3 ───────────── */}
        <H id="home">3 · Host advantage &amp; effective rating</H>
        <P>
          Host nations (USA, Mexico, Canada) playing inside their own country
          receive a home edge of <code>+55</code> Elo applied to the rating gap
          for that fixture only. Putting the pieces together, the{" "}
          <strong>effective rating</strong> used everywhere downstream is:
        </P>
        <Formula>
          R_eff(team) = R_current − penalty(team)
          <br />
          Δ(match) = R_eff(home) − R_eff(away) + homeEdge
        </Formula>
        <P>
          where <code>homeEdge</code> is +55 if the home team is the host
          nation, −55 if the away team is, otherwise 0.
        </P>

        {/* ───────────── 4 ───────────── */}
        <H id="goals">4 · From rating gap to a scoreline distribution</H>
        <P>
          The rating gap <code>Δ</code> is converted into expected goals for
          each side. A neutral, evenly-matched game sits at a baseline of{" "}
          <code>μ = 1.32</code> goals per team (recent World-Cup average); the
          gap tilts that baseline multiplicatively with elasticity{" "}
          <code>γ = 1.05</code>:
        </P>
        <Formula>
          s = exp( γ · Δ / 400 )
          <br />
          λ_home = clamp( μ · s , 0.15 , 4.6 )
          <br />
          λ_away = clamp( μ / s , 0.15 , 4.6 )
        </Formula>
        <P>
          Goals are then modelled as two near-independent Poisson processes.
          The probability of an exact scoreline (a, b) starts from the product
          of two Poisson masses and is corrected by the{" "}
          <strong>Dixon–Coles</strong> term <code>τ</code>, which fixes the
          well-known under-counting of low scores (0-0, 1-0, 0-1, 1-1) in the
          independent model, with dependence parameter <code>ρ = −0.08</code>:
        </P>
        <Formula>
          P(a, b) = τ(a, b) · Pois(a; λ_home) · Pois(b; λ_away)
        </Formula>
        <Formula>
          τ = 1 − λ_home·λ_away·ρ (0-0) · 1 + λ_home·ρ (0-1)
          <br />
          τ = 1 + λ_away·ρ (1-0) · 1 − ρ (1-1) · 1 otherwise
        </Formula>
        <P>
          The matrix is computed over 0–8 goals per team and normalised to sum
          to 1. Marginalising it gives the published win/draw/win
          probabilities, the expected goals shown on each match page, and the
          most-likely scorelines (the heat-map). Knockout matches multiply both{" "}
          <code>λ</code> by <code>0.88</code> to reflect the lower-scoring,
          more cautious nature of elimination football.
        </P>

        {/* ───────────── 5 ───────────── */}
        <H id="market">5 · The market benchmark</H>
        <P>
          When pre-match sportsbook odds are entered they are{" "}
          <strong>not</strong> blended into the prediction — the model stands on
          its own. They are converted to a probability benchmark by removing the
          bookmaker margin (the &ldquo;vig&rdquo;) with the proportional /
          multiplicative method: invert each decimal price and renormalise so
          the three outcomes sum to 1.
        </P>
        <Formula>
          p_i = (1 / odds_i) / ( 1/odds_home + 1/odds_draw + 1/odds_away )
        </Formula>
        <P>
          This de-vigged line is what the model is scored against on this page.
          Sharp closing lines (e.g. Pinnacle) embed both proprietary models and
          the information in large bet flow, so they are the toughest public
          baseline in football; matching them is the realistic target.
        </P>

        {/* ───────────── 6 ───────────── */}
        <H id="simulation">6 · Tournament simulation (Monte Carlo)</H>
        <P>
          Title odds and round-by-round probabilities come from simulating the
          entire remaining tournament <code>5,000</code> times. A single
          simulation:
        </P>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
          <li>
            <strong>Group stage.</strong> Recorded results are used as-is;
            unplayed fixtures are decided by drawing a scoreline from that
            match&apos;s probability matrix (§4). Standings use 3/1/0 points,
            broken by goal difference, then goals scored, then a random draw.
          </li>
          <li>
            <strong>Qualification.</strong> The top two of each group advance;
            the eight best third-placed teams (ranked by points, GD, GF) fill
            the rest of the 32-team knockout, following the tournament&apos;s
            published bracket template.
          </li>
          <li>
            <strong>Knockouts.</strong> Each tie draws a scoreline from the
            knockout-damped distribution. A draw goes to extra time and
            penalties, modelled as a near-coin-flip that still tilts to the
            stronger side by compressing the rating gap:
            <Formula>P(A wins shootout) = 1 / (1 + 10^((R_B − R_A) / 1200))</Formula>
            (equivalent to the Elo expectation on one-third of the gap).
          </li>
          <li>
            Reaching each stage (R32 → R16 → QF → SF → Final → Champion) is
            tallied; dividing by 5,000 gives each team&apos;s probability for
            that stage, and the mean group points becomes the expected-points
            column.
          </li>
        </ol>
        <P>
          The random generator is a seeded <code>mulberry32</code> stream keyed
          to the current data version, so identical inputs always reproduce
          identical odds — the forecasts are deterministic and auditable, not a
          different roll each refresh. With 5,000 runs the Monte-Carlo standard
          error on a mid-range probability is roughly{" "}
          <code>√(p(1−p)/5000) ≈ 0.7%</code>.
        </P>

        {/* ───────────── 7 ───────────── */}
        <H id="scoring">7 · How accuracy is scored</H>
        <P>
          To keep the model honest, each match&apos;s forecast is frozen at the
          instant its result is recorded — a true out-of-sample snapshot, taken
          before the Elo update — and scored with three standard,
          lower-is-better metrics. Writing <code>p</code> for the forecast
          vector over {"{home, draw, away}"} and <code>y</code> for the
          one-hot realised outcome:
        </P>
        <Formula>
          Brier = Σ_i (p_i − y_i)²
          <br />
          LogLoss = − ln( p_outcome )
          <br />
          RPS = ½ · Σ_k ( Σ_{"{i≤k}"} p_i − Σ_{"{i≤k}"} y_i )²
        </Formula>
        <P>
          Brier is the mean squared error across outcomes; log loss punishes
          confident wrong calls hardest; the ranked probability score respects
          the natural home → draw → away ordering, so a wrong call &ldquo;by one
          place&rdquo; costs less than the opposite result. The scoreboard above
          reports all three for the model and, on matches where odds were
          entered, the market — over the identical set of matches.
        </P>

        {/* ───────────── 8 ───────────── */}
        <H id="limits">8 · Assumptions &amp; limitations</H>
        <P>
          The model is deliberately transparent rather than maximal. It treats
          team strength as one scalar (no explicit attack/defence split beyond
          what the rating captures), assumes goals are conditionally Poisson
          with only a low-score dependence correction, and derives injury and
          host effects from interpretable hand-set weights rather than a fitted
          regression. Base ratings, player-importance weights and venue
          assignments are editable estimates. Results and squad availability are
          ingested live, so forecasts sharpen as the tournament progresses; the
          Model page is the running scorecard of how well that is working.
        </P>

        <p className="mt-8 border-t border-edge/60 pt-4 text-xs text-muted">
          Constants in force: baseline goals μ = 1.32 · goal elasticity γ =
          1.05 · Dixon–Coles ρ = −0.08 · knockout goal scale 0.88 · Elo K = 50 ·
          injury scale 65 (cap 160) · host advantage 55 Elo · 5,000 simulations
          · score matrix 0–8 goals. Source: <code>src/lib/model/</code>.
        </p>
      </div>
    </Card>
  );
}
