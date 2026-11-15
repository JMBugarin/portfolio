---
title: Pacer
romanNumeral: I
arcana: The Magician
seatMeshName: Seat_01
summary: Learned eviction for LLM prefix caches, tested against tuned heuristics on held-out public traces.
stack: [Rust, Python, LightGBM, MLX]
featuredOrder: 1
projectId: pacer
repoUrl: https://github.com/JMBugarin/pacer
---

A small learned policy asks a concrete question: which cached prefix is least likely to return? The case study documents the simulator, the comparisons, and where better hit ratios did not become better latency.
