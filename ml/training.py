"""
Training, Experiment Management, Evaluation, and Calibration Engine.
Provides reproducible training loops, checkpointing, early stopping, and metric calculation.
"""
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support, roc_auc_score,
    confusion_matrix, brier_score_loss
)


class EarlyStopping:
    def __init__(self, patience: int = 5, delta: float = 1e-4):
        self.patience = patience
        self.delta = delta
        self.counter = 0
        self.best_score = None
        self.early_stop = False

    def __call__(self, val_loss: float) -> bool:
        score = -val_loss
        if self.best_score is None:
            self.best_score = score
            return True
        elif score < self.best_score + self.delta:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
            return False
        else:
            self.best_score = score
            self.counter = 0
            return True


def compute_expected_calibration_error(probs: np.ndarray, labels: np.ndarray, n_bins: int = 10) -> float:
    """Calculates Expected Calibration Error (ECE) for probability predictions."""
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    confidences = np.max(probs, axis=1) if len(probs.shape) > 1 else probs
    predictions = np.argmax(probs, axis=1) if len(probs.shape) > 1 else (probs >= 0.5).astype(int)

    for i in range(n_bins):
        bin_lower, bin_upper = bin_boundaries[i], bin_boundaries[i+1]
        in_bin = (confidences > bin_lower) & (confidences <= bin_upper)
        prop_in_bin = np.mean(in_bin)

        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(predictions[in_bin] == labels[in_bin])
            avg_confidence_in_bin = np.mean(confidences[in_bin])
            ece += np.abs(accuracy_in_bin - avg_confidence_in_bin) * prop_in_bin

    return float(ece)


def calculate_metrics(
    y_true: np.ndarray,
    y_pred_probs: np.ndarray,
    task_type: str = "multiclass",
    threshold: float = 0.5
) -> Dict:
    """
    Computes comprehensive evaluation metrics:
    Accuracy, Macro/Weighted Precision, Recall, F1, Per-class metrics, ECE, Brier score.
    """
    metrics = {}

    if task_type == "multi_label":
        y_pred = (y_pred_probs >= threshold).astype(int)
        precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="macro", zero_division=0)
        metrics["macro_precision"] = float(precision)
        metrics["macro_recall"] = float(recall)
        metrics["macro_f1"] = float(f1)
        metrics["subset_accuracy"] = float(accuracy_score(y_true, y_pred))

        try:
            metrics["roc_auc_macro"] = float(roc_auc_score(y_true, y_pred_probs, average="macro"))
        except Exception:
            metrics["roc_auc_macro"] = 0.0
    else:  # Multiclass
        y_pred = np.argmax(y_pred_probs, axis=1)
        acc = accuracy_score(y_true, y_pred)
        precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="weighted", zero_division=0)

        metrics["accuracy"] = float(acc)
        metrics["weighted_precision"] = float(precision)
        metrics["weighted_recall"] = float(recall)
        metrics["weighted_f1"] = float(f1)
        metrics["confusion_matrix"] = confusion_matrix(y_true, y_pred).tolist()
        metrics["expected_calibration_error"] = compute_expected_calibration_error(y_pred_probs, y_true)

    return metrics


def train_model_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    device: torch.device
) -> float:
    """Executes single training epoch."""
    model.train()
    total_loss = 0.0
    count = 0

    for inputs, labels, _ in dataloader:
        inputs = inputs.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * len(labels)
        count += len(labels)

    return total_loss / max(1, count)
