"""Optional GPU training entry point for Omni SFT.

Requires a GPU environment with transformers, datasets, and peft installed.
This script is intentionally separate from the Netlify web app.
"""
import os

MODEL = os.getenv("OMNI_BASE_MODEL", "REPLACE_WITH_OPEN_WEIGHT_INSTRUCT_MODEL")
DATASET = "training/datasets/sft.jsonl"
OUTPUT = "training/output/omni-sft"

def main():
    if MODEL.startswith("REPLACE_"):
        raise SystemExit("Set OMNI_BASE_MODEL to an open-weight instruct model before training.")

    try:
        from datasets import load_dataset
        from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer
    except ImportError as exc:
        raise SystemExit(
            "Install the training dependencies in your GPU environment: "
            "transformers datasets accelerate peft"
        ) from exc

    dataset = load_dataset("json", data_files=DATASET, split="train")
    tokenizer = AutoTokenizer.from_pretrained(MODEL)
    model = AutoModelForCausalLM.from_pretrained(MODEL)

    def tokenize(example):
        text = "\n".join(
            f"{m['role']}: {m['content']}" for m in example["messages"]
        )
        return tokenizer(text, truncation=True, max_length=2048)

    tokenized = dataset.map(tokenize, remove_columns=dataset.column_names)
    args = TrainingArguments(
        output_dir=OUTPUT,
        num_train_epochs=2,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=16,
        learning_rate=2e-5,
        logging_steps=10,
        save_steps=250,
        gradient_checkpointing=True,
        report_to="none",
    )

    Trainer(
        model=model,
        args=args,
        train_dataset=tokenized,
    ).train()

    model.save_pretrained(OUTPUT)
    tokenizer.save_pretrained(OUTPUT)
    print(f"Saved Omni SFT checkpoint to {OUTPUT}")

if __name__ == "__main__":
    main()
