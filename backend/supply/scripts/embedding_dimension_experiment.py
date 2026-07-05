"""
Embedding Dimension Experiment Script

This script experiments with different embedding dimensions and dimensionality reduction methods
to find the optimal configuration for ingredient embeddings.

Methods tested:
1. Native output_dimensionality truncation (via `output_dimensionality` parameter)
2. PCA (Principal Component Analysis)
3. First-n-columns (naive slicing)
4. Last-n-columns (naive slicing from end)

Metrics:
- Top-10 overlap compared to 3072-dim baseline
- Vector size reduction
"""

import json
import os
import sys
import numpy as np
from pathlib import Path
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

# Add backend to path for Django
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from supply.models import Ingredient
from core.services.gemini import gemini_embed
from google.ai.generativelanguage_v1beta1.types import embed_content_pb2


def build_simplified_embedding_text(ingredient):
    """Build simplified embedding text with only name, description, and retail section."""
    parts = []
    
    # Name (required)
    if ingredient.name:
        parts.append(ingredient.name)
    
    # Description (if available)
    if ingredient.description:
        parts.append(ingredient.description)
    
    # Retail section (if available)
    if ingredient.retail_section:
        parts.append(f"Abteilung: {ingredient.retail_section.name}")
    
    return " ".join(parts)


def get_baseline_embeddings(ingredients):
    """Get 3072-dimensional baseline embeddings."""
    print("Getting 3072-dim baseline embeddings...")
    embeddings_3072 = {}
    
    for i, ing in enumerate(ingredients):
        if (i + 1) % 10 == 0:
            print(f"  {i + 1}/{len(ingredients)}")
        
        text = build_simplified_embedding_text(ing)
        
        try:
            # Get 3072-dim embedding (default from gemini-embedding-001)
            embedding_response = gemini_embed(
                contents=text,
                model="gemini-embedding-001",
                bypass_limits=True,  # For experiment/testing
            )
            embeddings_3072[ing.id] = embedding_response
        except Exception as e:
            print(f"  Error embedding ingredient {ing.id} ({ing.name}): {e}")
            embeddings_3072[ing.id] = None
    
    return embeddings_3072


def apply_pca(vectors_3072, target_dim):
    """Apply PCA to reduce dimensionality."""
    print(f"Applying PCA to reduce to {target_dim} dimensions...")
    
    # Convert to numpy array
    valid_vectors = [v for v in vectors_3072 if v is not None]
    vectors_array = np.array(valid_vectors)
    
    # Standardize
    scaler = StandardScaler()
    vectors_scaled = scaler.fit_transform(vectors_array)
    
    # Apply PCA
    pca = PCA(n_components=target_dim)
    vectors_reduced = pca.fit_transform(vectors_scaled)
    
    # Explained variance
    explained_var = np.sum(pca.explained_variance_ratio_)
    print(f"  Explained variance ratio: {explained_var:.4f}")
    
    return pca, vectors_reduced, scaler


def slice_dimensions(vectors, slice_type, target_dim):
    """Slice dimensions from full vectors."""
    if slice_type == 'first':
        return vectors[:, :target_dim]
    elif slice_type == 'last':
        return vectors[:, -target_dim:]
    else:
        raise ValueError(f"Unknown slice type: {slice_type}")


def calculate_top_10_overlap(vectors_baseline, vectors_reduced):
    """Calculate top-10 overlap metric."""
    # For each vector in reduced, find if its top 10 most similar in baseline 
    # contain the same top 10 when using reduced vectors
    overlaps = []
    
    for i in range(len(vectors_baseline)):
        # Baseline: cosine similarity with all others
        baseline_vec = vectors_baseline[i]
        base_norm = np.linalg.norm(baseline_vec)
        base_sims = []
        for j in range(len(vectors_baseline)):
            other_norm = np.linalg.norm(vectors_baseline[j])
            if base_norm > 0 and other_norm > 0:
                sim = np.dot(baseline_vec, vectors_baseline[j]) / (base_norm * other_norm)
                base_sims.append((j, sim))
        
        base_top10 = set([idx for idx, _ in sorted(base_sims, key=lambda x: -x[1])[:10]])
        
        # Reduced: cosine similarity with all others
        reduced_vec = vectors_reduced[i]
        red_norm = np.linalg.norm(reduced_vec)
        red_sims = []
        for j in range(len(vectors_reduced)):
            other_norm = np.linalg.norm(vectors_reduced[j])
            if red_norm > 0 and other_norm > 0:
                sim = np.dot(reduced_vec, vectors_reduced[j]) / (red_norm * other_norm)
                red_sims.append((j, sim))
        
        red_top10 = set([idx for idx, _ in sorted(red_sims, key=lambda x: -x[1])[:10]])
        
        # Calculate overlap
        overlap = len(base_top10 & red_top10) / 10.0  # 0-1 scale
        overlaps.append(overlap)
    
    return np.mean(overlaps)


def run_experiment():
    """Run the embedding dimension experiment."""
    # Load test ingredients from fixture
    fixture_path = Path(__file__).parent.parent / "fixtures" / "test_ingredients_100.json"
    with open(fixture_path, 'r', encoding='utf-8') as f:
        fixture_data = json.load(f)
    
    ingredient_ids = [item['id'] for item in fixture_data]
    ingredients = Ingredient.objects.filter(id__in=ingredient_ids).select_related('retail_section')
    ingredients = list(ingredients)  # Keep order
    
    print(f"Loaded {len(ingredients)} test ingredients")
    
    # Get baseline 3072-dim embeddings
    embeddings_3072 = get_baseline_embeddings(ingredients)
    valid_embeddings_3072 = [v for v in embeddings_3072.values() if v is not None]
    vectors_3072 = np.array(valid_embeddings_3072)
    
    print(f"\nBaseline: {len(valid_embeddings_3072)} valid 3072-dim embeddings")
    
    # Target dimensions to test
    target_dims = [768, 384, 256, 128, 64]
    
    results = {
        'baseline': {
            'dim': 3072,
            'overlap': 1.0,
            'size_ratio': 1.0,
        },
        'methods': {}
    }
    
    # Test each method for each target dimension
    # NOTE: 'native' method requires output_dimensionality support in the Gemini client API
    methods = ['pca', 'first', 'last']  # Excluding 'native' for now
    
    for method in methods:
        results['methods'][method] = {}
        print(f"\n=== Method: {method} ===")
        
        for target_dim in target_dims:
            try:
                if method == 'pca':
                    # Apply PCA
                    pca, vectors_reduced, scaler = apply_pca(vectors_3072, target_dim)
                    
                elif method == 'first':
                    # First n columns
                    vectors_reduced = slice_dimensions(vectors_3072, 'first', target_dim)
                    
                elif method == 'last':
                    # Last n columns
                    vectors_reduced = slice_dimensions(vectors_3072, 'last', target_dim)
                
                # Calculate metrics
                overlap = calculate_top_10_overlap(vectors_3072, vectors_reduced)
                size_ratio = target_dim / 3072
                
                results['methods'][method][target_dim] = {
                    'overlap': overlap,
                    'size_ratio': size_ratio,
                    'size_bytes': target_dim * 4,  # float32 = 4 bytes
                }
                
                print(f"  {target_dim}-dim: overlap={overlap:.3f}, size={size_ratio:.1%}")
                
            except Exception as e:
                print(f"  {target_dim}-dim: ERROR - {e}")
                results['methods'][method][target_dim] = {'error': str(e)}
    
    # Save results
    output_path = Path(__file__).parent / "embedding_dimension_results.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n\nResults saved to {output_path}")
    print("\nSummary:")
    print("Target Dim | PCA   | First | Last")
    print("----------|-------|-------|------")
    for dim in target_dims:
        row = f"{dim:9d} |"
        for method in ['pca', 'first', 'last']:
            if dim in results['methods'][method] and 'overlap' in results['methods'][method][dim]:
                overlap = results['methods'][method][dim]['overlap']
                row += f" {overlap:.3f} |"
            else:
                row += "  N/A  |"
        print(row)


if __name__ == '__main__':
    run_experiment()
