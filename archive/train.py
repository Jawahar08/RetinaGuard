"""
Diabetic Retinopathy Detection - Model Training Pipeline
This script trains an Image Classifier using EfficientNetB0 pretrained on ImageNet.
"""

import sys
# Filter out the global Python installer directory from sys.path if it contains shadowing files
sys.path = [p for p in sys.path if p.rstrip('\\').rstrip('/') != r'C:\Users\shrir\AppData\Local\Programs\Python\Python311']

import os
import pickle
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)
import tensorflow as tf

# ==========================================
# 1. GPU Detection & Configuration
# ==========================================
print("Checking system hardware configuration...")
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    print(f"Success: GPU detected! {len(gpus)} GPU(s) available.")
    for i, gpu in enumerate(gpus):
        print(f"  - GPU {i}: {gpu.name}")
        try:
            # Enable memory growth to prevent TensorFlow from allocating all GPU memory at startup
            tf.config.experimental.set_memory_growth(gpu, True)
            print(f"  - Enabled memory growth for GPU {i}")
        except RuntimeError as e:
            print(f"  - Error enabling memory growth: {e}")
else:
    print("No GPU detected. Running training on CPU.")

# ==========================================
# 2. Path Setup and Dataset Loading
# ==========================================
# Look for dataset in 'gaussian_filtered_images' and handle nested folders
base_dir = "gaussian_filtered_images"
if os.path.exists(os.path.join(base_dir, "gaussian_filtered_images")):
    img_dir = os.path.join(base_dir, "gaussian_filtered_images")
elif os.path.exists(base_dir):
    img_dir = base_dir
else:
    raise FileNotFoundError(
        f"Could not locate image directory in '{base_dir}'. "
        "Please ensure the gaussian_filtered_images directory is present in the workspace."
    )

print(f"Dataset directory identified: {os.path.abspath(img_dir)}")

# Parameters
BATCH_SIZE = 32
IMAGE_SIZE = (224, 224)
EPOCHS = 20

print("Loading training dataset (80% split)...")
train_ds = tf.keras.utils.image_dataset_from_directory(
    img_dir,
    validation_split=0.2,
    subset="training",
    seed=123,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode='int'
)

print("Loading validation dataset (20% split)...")
val_ds = tf.keras.utils.image_dataset_from_directory(
    img_dir,
    validation_split=0.2,
    subset="validation",
    seed=123,
    image_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    label_mode='int'
)

class_names = train_ds.class_names
num_classes = len(class_names)
print(f"Detected class labels: {class_names} ({num_classes} classes)")

# Prefetch datasets for performance optimization (CPU pre-loading)
AUTOTUNE = tf.data.AUTOTUNE
train_ds = train_ds.prefetch(buffer_size=AUTOTUNE)
val_ds = val_ds.prefetch(buffer_size=AUTOTUNE)

# ==========================================
# 3. Model Definition and Layers
# ==========================================
# Data Augmentation: Rotation, Zoom, Horizontal Flip, Brightness variation
data_augmentation = tf.keras.Sequential([
    tf.keras.layers.RandomRotation(0.2),
    tf.keras.layers.RandomZoom(0.2),
    tf.keras.layers.RandomFlip("horizontal"),
    tf.keras.layers.RandomBrightness(0.2),
], name="data_augmentation")

# Build custom network using Keras Functional API
inputs = tf.keras.Input(shape=(IMAGE_SIZE[0], IMAGE_SIZE[1], 3))

# 1. Apply data augmentation (active only during training)
augmented = data_augmentation(inputs)

# 2. Normalize inputs to [0, 1] as requested
normalized = tf.keras.layers.Rescaling(1.0 / 255.0)(augmented)

# 3. Rescale back to [0, 255] because EfficientNetB0 has its own internal rescaling layer
rescaled_for_effnet = normalized * 255.0

# 4. Define base pre-trained model (EfficientNetB0)
base_model = tf.keras.applications.EfficientNetB0(
    include_top=False,
    weights='imagenet',
    input_shape=(IMAGE_SIZE[0], IMAGE_SIZE[1], 3)
)

# Freeze base model layers initially
base_model.trainable = False

# Feed the preprocessed/augmented inputs to the frozen base model
# Using training=False ensures that batch normalization layers do not update their stats during training
x = base_model(rescaled_for_effnet, training=False)

# 5. Top Classification Head
x = tf.keras.layers.GlobalAveragePooling2D()(x)
outputs = tf.keras.layers.Dense(num_classes, activation='softmax', name="softmax_classifier")(x)

# Construct final model
model = tf.keras.Model(inputs, outputs, name="DiabeticRetinopathyEfficientNetB0")

# Compile Model
print("Compiling model...")
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),
    loss=tf.keras.losses.SparseCategoricalCrossentropy(),
    metrics=['accuracy']
)

model.summary()

# ==========================================
# 4. Callbacks & Model Training
# ==========================================
# Define callbacks
early_stopping = tf.keras.callbacks.EarlyStopping(
    monitor='val_loss',
    patience=5,
    restore_best_weights=True,
    verbose=1
)

checkpoint = tf.keras.callbacks.ModelCheckpoint(
    filepath='model.keras',
    monitor='val_loss',
    save_best_only=True,
    verbose=1
)

print(f"Starting training for {EPOCHS} epochs...")
history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS,
    callbacks=[early_stopping, checkpoint]
)

# ==========================================
# 5. Saving Best Model
# ==========================================
print("\nTraining complete. Saving the best model...")

# Load the absolute best model from the checkpoint (to guarantee we get the lowest val_loss)
try:
    print("Loading the best model weights from model.keras...")
    best_model = tf.keras.models.load_model('model.keras')
except Exception as e:
    print(f"Could not load saved model.keras, using current in-memory model weights. Error: {e}")
    best_model = model

# Save as export.pkl using native Keras 3.x pickle support
print("Saving best model as export.pkl...")
try:
    with open('export.pkl', 'wb') as f:
        pickle.dump(best_model, f)
    print("Successfully saved best model as export.pkl")
except Exception as e:
    print(f"Failed to save as export.pkl: {e}")

# ==========================================
# 6. Evaluation and Inference Metrics
# ==========================================
print("\nEvaluating model performance on validation split...")
y_true = []
y_pred = []

for images, labels in val_ds:
    # Predict batch
    preds = best_model.predict(images, verbose=0)
    pred_classes = np.argmax(preds, axis=1)
    y_true.extend(labels.numpy())
    y_pred.extend(pred_classes)

y_true = np.array(y_true)
y_pred = np.array(y_pred)

# Calculate Classification Metrics
accuracy = accuracy_score(y_true, y_pred)
precision = precision_score(y_true, y_pred, average='macro', zero_division=0)
recall = recall_score(y_true, y_pred, average='macro', zero_division=0)
f1 = f1_score(y_true, y_pred, average='macro', zero_division=0)
cm = confusion_matrix(y_true, y_pred)
report = classification_report(y_true, y_pred, target_names=class_names, zero_division=0)

# Print metrics to console
print("\n" + "="*60)
print("                    VALIDATION METRICS REPORT")
print("="*60)
print(f"Accuracy:                  {accuracy:.4f}")
print(f"Precision (Macro Average): {precision:.4f}")
print(f"Recall (Macro Average):    {recall:.4f}")
print(f"F1 Score (Macro Average):  {f1:.4f}")
print("\nConfusion Matrix:")
print(cm)
print("\nClassification Report:")
print(report)
print("="*60)

# ==========================================
# 7. Visualization
# ==========================================
print("Plotting training curves...")
acc = history.history['accuracy']
val_acc = history.history['val_accuracy']
loss = history.history['loss']
val_loss = history.history['val_loss']
epochs_range = range(1, len(acc) + 1)

plt.figure(figsize=(14, 6))

# Plot Accuracy curves
plt.subplot(1, 2, 1)
plt.plot(epochs_range, acc, 'b-o', label='Training Accuracy')
plt.plot(epochs_range, val_acc, 'r-s', label='Validation Accuracy')
plt.title('Training and Validation Accuracy')
plt.xlabel('Epochs')
plt.ylabel('Accuracy')
plt.legend(loc='lower right')
plt.grid(True)

# Plot Loss curves
plt.subplot(1, 2, 2)
plt.plot(epochs_range, loss, 'b-o', label='Training Loss')
plt.plot(epochs_range, val_loss, 'r-s', label='Validation Loss')
plt.title('Training and Validation Loss')
plt.xlabel('Epochs')
plt.ylabel('Loss')
plt.legend(loc='upper right')
plt.grid(True)

plt.tight_layout()
plot_path = 'training_plots.png'
plt.savefig(plot_path)
print(f"Visualization plots successfully saved as '{plot_path}'")
plt.show()
