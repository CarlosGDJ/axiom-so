# Axiom Clinical-Informed Model v2

## Scope
This model is a clinical-informed behavioral regulation engine.
It is not a medical diagnostic device and must not be used as a standalone clinical diagnosis.

## Scientific anchors
1. Allostatic load and stress accumulation (McEwen, 1998).
2. Homeostatic reinforcement learning (Keramati and Gutkin, 2014).
3. Dopamine reward prediction and motivation (Schultz, 1997; Berridge and Robinson, 1998).
4. Executive control under stress (Miller and Cohen, 2001; Arnsten, 2009).
5. Sleep and neuroendocrine regulation (Van Cauter and colleagues).
6. Social buffering effects on cortisol (Heinrichs et al., 2003).

## Latent axes
The v2 model computes five latent axes on a 0-100 scale:
1. `threat_load`
2. `reward_drive`
3. `executive_control`
4. `recovery_capacity`
5. `social_buffer`

## Data sources used in app
1. Current simulated stats (`RPGStats`):
   - dopamina
   - serotonina
   - cortisol
   - foco
   - energia
   - sueno/sueno-keyed sleep value
   - conexion_social
   - carga_dopaminergica
2. Signal density over 7 days:
   - events
   - interactions
   - transactions
3. Calibration confidence from historical transitions.

## Risk synthesis
The model computes:
1. `risk_score` (0-100, higher is higher risk).
2. `risk_band`:
   - `LOW`
   - `MODERATE`
   - `HIGH`
   - `SEVERE`
3. `confidence` and `data_quality` (0-1).
4. Marker codes for explainability (`HIGH_THREAT_LOAD`, `LOW_RECOVERY_CAPACITY`, etc.).

## Model governance
1. Always persist `model_version`.
2. Keep feature flag support (`clinical_v2_enabled`) in `dashboardConfig/model_flags`.
3. Keep v1 score/state logic active until v2 validation is complete.
4. Do not claim diagnostic certainty in UI text.

## References (DOI / canonical links)
1. McEwen BS. N Engl J Med (1998): https://doi.org/10.1056/NEJM199801153380307
2. Keramati M, Gutkin B. Neuron (2014): https://doi.org/10.1016/j.neuron.2014.01.041
3. Schultz W et al. Science (1997): https://doi.org/10.1126/science.275.5306.1593
4. Berridge KC, Robinson TE. Brain Res Rev (1998): https://www.sciencedirect.com/science/article/pii/S0165017398000198
5. Miller EK, Cohen JD. Annu Rev Neurosci (2001): https://doi.org/10.1146/annurev.neuro.24.1.167
6. Arnsten AFT. Nat Rev Neurosci (2009): https://doi.org/10.1038/nrn2648
7. Heinrichs M et al. Biol Psychiatry (2003): https://pubmed.ncbi.nlm.nih.gov/14675803/
