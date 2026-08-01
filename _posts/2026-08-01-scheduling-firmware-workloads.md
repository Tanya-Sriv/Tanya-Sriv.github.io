---
layout: post
title: "Scheduling Firmware Workloads on Heterogeneous SoCs"
tags: [soc, scheduling]
read_time: "7 min read"
---

Modern SoCs are small federations: CPU clusters, a GPU, an NPU, DSPs, and a
handful of microcontrollers, each running its own firmware. The interesting
scheduling problems start *after* you leave the OS — when workloads have to be
placed across blocks that don't share a scheduler, a clock domain, or even an
instruction set.[^1]

## The placement problem

Suppose a vision pipeline needs preprocessing, inference, and postprocessing.
Every stage *could* run on more than one block, but each choice trades latency
against power against contention:

| Stage | CPU | GPU | NPU | Best fit |
|---|---|---|---|---|
| Preprocess (resize, normalize) | 4.1 ms | 0.9 ms | — | GPU |
| Inference (INT8 CNN) | 38 ms | 6.2 ms | 1.8 ms | NPU |
| Postprocess (NMS) | 0.7 ms | 1.1 ms | — | CPU |

Try putting that table on Medium. (You can't — you'd screenshot a spreadsheet.)

## Why simulate instead of buying hardware

Real dev boards are slow to iterate on: reflashing firmware to test a
scheduling policy is a minutes-long loop, and board farms are expensive.
A discrete-event simulation gets the loop under a second.

### A minimal model

```python
class Block:
    # One schedulable unit: cpu-cluster, gpu, npu, dsp…
    def __init__(self, name, perf, power_mw):
        self.name, self.perf, self.power = name, perf, power_mw
        self.queue = []

def place(task, blocks):
    # Greedy: earliest-finish-time with a power penalty
    return min(blocks, key=lambda b:
        b.eta(task) + 0.15 * b.power_cost(task))
```

### What falls out

- Greedy earliest-finish beats static pinning by ~22% on mixed loads
  - …but only when migration cost is modeled honestly (nested list — also impossible on Medium)
- Power-aware penalties change placement in ~1 of 6 decisions

## Takeaways

> Model the costs you're tempted to ignore — migration and cache warmth decide
> more placements than raw throughput does.

[^1]: "Firmware" here means the persistent code running on each block, not just boot code.
