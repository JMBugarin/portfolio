---
title: Pacer
description: Learned eviction for LLM prefix caches, tested against tuned heuristics on held-out public production traces.
techStack: [Rust, Python, LightGBM, PyO3, MLX, GitHub Actions]
githubUrl: https://github.com/JMBugarin/pacer
category: Systems and ML research
stat: Beats the best tuned heuristic in 13 of 16 cells
order: 1
problem: An LLM server keeps the computed state for repeated prompt prefixes (the KV cache) so the next request can skip that work. When the cache fills, something has to go. Throw out a block someone is about to ask for and the server does the work twice. Standard rules like LRU only look at recency, and know nothing about how chat, API, coding and reasoning traffic differ.
solution: Pacer asks a sharper question about every candidate block, will it be used again soon, and answers with a small LightGBM model trained per workload. The policy samples 32 evictable blocks and drops the one least likely to return, at 49 to 230 ns per eviction. I tested it on four public Alibaba Qwen traces against baselines I tuned myself, on an hour of traffic the model never saw.
next:
  - "Add a guard for distribution shift, such as a sampled shadow LRU to fall back to when the model starts losing, before one model is trusted across workloads."
  - "Score blocks by compute saved instead of reuse probability. The first experiment leads on chat at small caches but costs hit ratio, so the blend needs more work."
  - "Try traces that carry request content, like tool calls and system-prompt identity, which should make conversation continuation more predictable."
  - "Model CPU or SSD offload tiers, where a miss costs different amounts for different blocks."
  - "Replace the laptop replay (0.6B model, synthetic and replayed requests) with a real serving setup to measure time to first token at scale."
  - "Check exact cached output on other MLX versions and devices. The row thresholds were calibrated for one model on one Mac."
results:
  - "Chat trace, 2% cache, held-out hour: LRU 24.36%, S3-FIFO 26.26%, ATC'25 27.97%, Pacer 30.19% hit ratio. The offline-optimal Belady policy reaches 55.16%."
  - "Better than the best tuned heuristic in 13 of 16 trace and size cells, tied in 3, worse in 0."
  - "A live replay on a laptop (0.6B model through MLX) cut mean time to first token by 1.2% against LRU (95% CI 0.1 to 2.4%). Small, but it checks the mechanics end to end."
  - "Frozen serving run (protocol v4): Pacer was 0.37 to 0.44 ms faster than LRU in mean time to first token in all four paired repeats, about 2.5%. All 664 served cache hits were bitwise equal to a full prefill."
  - "14 Rust tests and 462 Python tests pass in CI."
struggles:
  - issue: "My first learned policy lost to LRU. It imitated Belady from logged cache states and picked the right candidate 97.7% of the time on held-out decisions, but in the simulator it ended up 4.3 points below LRU at 10% cache on chat. Its target never asked the eviction question."
    fix: "I changed the question to the one the cache actually faces: will this block be used again before it would have been evicted anyway? That hazard model, trained on cache-independent rows, became Pacer. The first model stays in as an ablation."
  - issue: "Two independent reviewers found my labels could see the validation window. Training rows were cut at minute 45 but their labels looked up to minute 60, so my validation numbers and per-cell choices were optimistic. The test hour was not affected."
    fix: "I refit on rows whose whole window ends by minute 45, early-stopped on minutes 45 to 52.5, and reported AUC on 52.5 to 60. I also fixed a censoring bias that over-counted positives at long horizons, and logged every look at the test hour."
  - issue: "Deciding was too slow. About 25 µs per eviction on API traffic, almost all of it the model."
    fix: "I shrank the model to 13 to 37 trees, within 0.005 AUC of models with 85 to 213, scored candidates in a batch, and let one sample serve up to 4 evictions. That brought it to 49 to 230 ns per evicted block, less than my heap-based LRU at 255 to 453 ns."
  - issue: "Some results looked too good. Cache hits on the reasoning trace were partly artificial, because blocks were named after follow-ups that had dropped the reasoning, and one baseline (ARC) took up to 384 s per run."
    fix: "I only credit decode-completed blocks when the follow-up is long enough to contain the answer verbatim, which changed 319 of 1,200 thinking follow-ups for every policy. ARC got lazy heaps and now runs in seconds with identical results."
  - issue: "A cached prefill didn't always match a full one. It picked the same next token only 97.5% of the time, and my first serving benchmark showed Pacer slower than LRU by 3.6 to 5.0 ms."
    fix: "Two causes. MLX picks its quantized matmul kernel by row count, so a short cached suffix rounded differently from a long prefill. An exact-output mode pads each matmul to its calibrated row-stable size, and cached logits now match bit for bit. The slowdown came from my harness, which ran an extra cached forward on every hit, so more hits cost more. On a new frozen run with both fixed, Pacer was ahead of LRU in every repeat."
media:
  - kind: video
    group: demo
    src: media/pacer/pacer-demo.mp4
    poster: media/pacer/demo-table-1600.webp
    alt: Terminal recording of Pacer's make demo command comparing five eviction policies
    caption: "The make demo command in real time: five policies on the held-out hour of the chat trace. About 39 seconds, most of it one slow baseline."
    width: 1920
    height: 1080
  - kind: image
    group: results
    src: media/pacer/fig-hit-vs-capacity-1600.webp
    alt: Four line charts of block hit ratio against cache size, one per trace. Pacer sits at or above the best tuned heuristic in each and below the Belady offline reference.
    caption: Block hit ratio on the held-out hour for each trace and cache size. Drawn by the repo's own figure script from committed results.
    width: 1600
    height: 443
  - kind: image
    group: results
    src: media/pacer/fig-oracle-ladder-chat-1280.webp
    alt: Bar chart of block hit ratio on the chat trace at four cache sizes, comparing LRU, ATC'25, Pacer and the offline reference policies.
    caption: Where the headroom is on the chat trace. The hatched bars are oracles, showing how much better a perfect predictor could do.
    width: 1280
    height: 672
  - kind: image
    group: results
    src: media/pacer/fig-reuse-model-auc-1040.webp
    alt: Dot plot of held-out AUC for predicting block reuse on four traces, Pacer's model against the ATC'25 workload model.
    caption: Held-out AUC for predicting reuse. Pacer's model beats the ATC'25 workload model on all four traces.
    width: 1040
    height: 448
---
## Decisions

- **A hard baseline.** I tune every baseline on validation data and compare against the best one per cell, picked with hindsight. That favors the baselines on purpose, so a weak default can't make the result look good.
- **Honest splits.** Train on minutes 0 to 45, choose settings on 45 to 60, report the second hour, and log every extra look at the test hour.
- **Success criteria first.** I wrote them before the build and published the misses.
- **An executable spec.** A Python reference simulator checks the Rust one.

## Limits

- Trace-driven simulation, not a production deployment.
- Two hours per trace and one temporal split; models are per workload and don't transfer.
- No gain on chat at 5 to 10% cache.
