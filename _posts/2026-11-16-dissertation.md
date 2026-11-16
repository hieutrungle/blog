---
title: "Spatial Intelligence for Smart Radio Environments: Learning-Based Control and Joint Placement of Mechanically Reconfigurable Reflectors"
kind: Dissertation
date: 2026-11-16
permalink: /dissertation/
summary: "Ph.D. dissertation, Texas A&M University (expected December 2026). Positions, not pilot-based channel estimates, are enough to configure, control and place mechanically reconfigurable metallic reflectors."
description: "Ph.D. dissertation by Hieu T. Le, Texas A&M University: learning-based control and joint placement of mechanically reconfigurable reflectors from spatial information."
---

**Hieu T. Le** · Doctor of Philosophy, Electrical Engineering · Texas A&M University · expected December 2026

**Committee:** Sabit Ekin (Chair), Jian Tao (Co-Chair), Erchin Serpedin, Arya Menon

<div class="btns">
  <a class="btn primary" href="https://hieutrungle.github.io/phd-defense/">Defense slides</a>
  <span class="btn disabled" title="Posted after final approval">Full text (PDF): after final approval</span>
</div>

<div class="note">The full text will be posted on this page after final approval by the committee and the Texas A&amp;M Graduate and Professional School, and will also be archived in the Texas A&amp;M institutional repository (OAKTrust). This address stays the same.</div>

## Abstract

Reconfigurable intelligent surfaces can reshape indoor propagation, but electronic designs need pilot-based, per-element channel state information (CSI), whose overhead grows with the numbers of elements and users. This dissertation argues that spatial information, meaning the positions of access points and reflector tiles, estimates of user positions, and a site model, suffices to configure, control, and place mechanically reconfigurable metallic reflectors without pilot-based channel estimation; the cost moves to localization accuracy and site-model fidelity. A focal-point abstraction reduces many servo-actuated tile orientations to a few focal coordinates. Because geometric steering is band-independent, control is studied at millimeter-wave and placement at Wi-Fi frequencies.

First, geometric beam-focusing from known positions raises the path gain in ray-traced non-line-of-sight hallways at 28 GHz by 53.0 dB (L-shaped) and 87.5 dB (T-shaped) relative to no reflector. Focal-point control is then learned by decentralized multi-agent reinforcement learning (MARL); the agents act on user-position estimates, with received power used only as the training reward. With three mobile users at 60 GHz, decentralized agents improve received signal strength by 20.7 dB over a static flat reflector.

Because that controller fixes the tile-to-user assignment, hierarchical MARL adds a slower policy that assigns users to array segments, and low-level policies steer each segment's focal point every slot. With four users and two arrays, the learned allocator raises mean received signal strength by 1.88 dB over the strongest heuristic and by 7.94 dB over a single-agent controller. Localization studies indicate that decimeter-level accuracy is required.

Finally, access point positions and orientations and the position and focal points of a reflector configured once at installation are optimized jointly by particle swarm optimization and gradient refinement through differentiable ray tracing. In a 5.18 GHz office with three access points, one optimized reflector improves the seed-averaged priority-region fifth-percentile received signal strength by 4.8 dB, and in both tested layouts the −65 dBm target is met with one fewer access point, with small margins. All results are ray-traced and await hardware validation.

## What is inside

1. **Geometric beam-focusing:** a bisector rule and a focal-point abstraction steer tile arrays around corners from known positions (28 GHz hallways).
2. **Learned control:** decentralized multi-agent reinforcement learning moves each segment's focal point from user-position estimates (60 GHz, moving users).
3. **Hierarchical control:** a slower policy assigns users to array segments while fast policies keep refocusing every slot.
4. **Joint placement:** access points and a passive reflector are placed together by particle swarm optimization and gradient refinement through differentiable ray tracing (5.18 GHz Wi-Fi).

## Papers from this dissertation

1. H. Le, O. Bedir, M. Ibrahim, J. Tao, and S. Ekin, "Guiding wireless signals with arrays of metallic linear Fresnel reflectors: A low-cost, frequency-versatile, and practical approach," in *Proc. IEEE 100th Vehicular Technology Conf. (VTC2024-Fall)*, Washington, DC, USA, 2024, pp. 1–7. [doi:10.1109/VTC2024-Fall63153.2024.10757704](https://doi.org/10.1109/VTC2024-Fall63153.2024.10757704)
2. H. Le, O. Bedir, M. Ibrahim, J. Tao, and S. Ekin, "Signal Whisperers: Enhancing wireless reception using DRL-guided reflector arrays," *IEEE Trans. Mach. Learn. Commun. Netw.*, vol. 4, pp. 265–281, 2026. [doi:10.1109/TMLCN.2025.3650440](https://doi.org/10.1109/TMLCN.2025.3650440)
3. H. Le, O. Bedir, M. Ibrahim, J. Tao, and S. Ekin, "Bypassing the CSI bottleneck: MARL-driven spatial control for reflector arrays," submitted to IEEE ICC 2027 (under review). [arXiv:2604.05162](https://arxiv.org/abs/2604.05162)
4. H. Le, O. Bedir, M. Ibrahim, J. Tao, and S. Ekin, "Learning to Reflect: Hierarchical multi-agent reinforcement learning for CSI-free mmWave beam-focusing," *IEEE Trans. Mach. Learn. Commun. Netw.* (under review). [arXiv:2603.07370](https://arxiv.org/abs/2603.07370)
5. H. Le, M. Ibrahim, O. Bedir, J. Tao, and S. Ekin, "Learning to Focus: CSI-free hierarchical MARL for reconfigurable reflectors," accepted, IEEE GLOBECOM 2026, Macau. [arXiv:2604.05165](https://arxiv.org/abs/2604.05165)
6. H. Le, M. Ibrahim, J. Tao, and S. Ekin, "Can a passive reflector replace an access point? Joint indoor placement of access points and reflectors via differentiable ray tracing," submitted to *IEEE Open J. Commun. Soc.* (under review).
