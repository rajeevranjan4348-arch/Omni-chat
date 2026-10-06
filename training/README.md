# Omni Model Training

This directory contains the training foundation for an Omni-style assistant.

## What this trains
- Instruction following (SFT)
- Preference alignment (chosen vs rejected responses)
- Tool-use behavior
- Style, tone, and response quality

## What it does not do
It does not reproduce or copy proprietary ChatGPT model weights, hidden prompts, or private training data.

## Recommended path
1. Start from a capable open-weight instruct model.
2. Add approved Omni examples to `datasets/sft.jsonl`.
3. Add preference pairs to `datasets/preferences.jsonl`.
4. Run supervised fine-tuning on a GPU/Colab environment.
5. Run evaluation before accepting a new adapter/checkpoint.
6. Deploy the resulting model behind an API and keep the existing Omni UI unchanged.

The included examples are intentionally small starter data, not a claim that the model is already trained.
