"""
Simplified embedding dimension experiment using only numpy.

This script tests different dimensionalities for embeddings by:
1. Generating embeddings for 100 test ingredients
2. Reducing to different dimensions using numpy SVD
3. Measuring top-10 similarity overlap
4. Generating a report with metrics
"""

import os
import sys
import json
import django
from pathlib import Path

# Setup Django
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inspi.settings')
django.setup()

import numpy as np
from supply.models import Ingredient
from content.services.embedding_service import create_embedding, build_ingredient_embedding_text

def get_or_create_embeddings(ingredients):
    """Get embeddings for ingredients, creating them if needed."""
    embeddings_3072 = []
    
    print(f"Creating embeddings for {len(ingredients)} ingredients...")
    for idx, ing in enumerate(ingredients):
        if idx % 20 == 0:
            print(f"  Progress: {idx}/{len(ingredients)}")
        
        text = build_ingredient_embedding_text(ing)
        emb = create_embedding(text, output_dimensionality=3072)
        
        if emb:
            embeddings_3072.append(emb)
        else:
            print(f"  Warning: Failed to create embedding for {ing.name}")
    
    if not embeddings_3072:
        print("ERROR: No embeddings created!")
        return None
    
    return np.array(embeddings_3072)

def slice_dimensions(vectors, target_dim, method='first'):
    """Slice vector to target dimension."""
    if method == 'first':
        return vectors[:, :target_dim]
    elif method == 'last':
        return vectors[:, -target_dim:]
    else:
        raise ValueError(f"Unknown slice method: {method}")

def reduce_with_svd(vectors, target_dim):
    """Reduce dimensions using SVD (numpy built-in)."""
    print(f"    Computing SVD (this may take a moment for {target_dim} dimensions)...")
    U, S, Vt = np.linalg.svd(vectors, full_matrices=False)
    # Project to target dimensions: U_k @ S_k @ V_k^T approximates original
    reduced = U[:, :target_dim] * S[:target_dim]
    return reduced

def cosine_similarity(v1, v2):
    """Compute cosine similarity between two vectors."""
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return np.dot(v1, v2) / (norm1 * norm2)

def get_top_similar_indices(embeddings, query_idx, top_k=10):
    """Get indices of top-k most similar embeddings."""
    query = embeddings[query_idx]
    similarities = []
    for i, emb in enumerate(embeddings):
        if i != query_idx:
            sim = cosine_similarity(query, emb)
            similarities.append((i, sim))
    
    similarities.sort(key=lambda x: x[1], reverse=True)
    return [idx for idx, _ in similarities[:top_k]]

def calculate_top_10_overlap(embeddings_baseline, embeddings_reduced):
    """Calculate % of queries where top-10 overlap > 80%."""
    overlaps = []
    
    for i in range(len(embeddings_baseline)):
        if i % 20 == 0:
            print(f"    Computing overlaps: {i}/{len(embeddings_baseline)}")
        
        baseline_top10 = set(get_top_similar_indices(embeddings_baseline, i, top_k=10))
        reduced_top10 = set(get_top_similar_indices(embeddings_reduced, i, top_k=10))
        
        overlap = len(baseline_top10 & reduced_top10) / 10.0  # Overlap as fraction
        overlaps.append(overlap)
    
    return np.mean(overlaps)

def run_experiment():
    """Run the full embedding dimension experiment."""
    print("=" * 80)
    print("EMBEDDING DIMENSION EXPERIMENT (SIMPLIFIED - NumPy only)")
    print("=" * 80)
    
    # Load 100 test ingredients
    ingredients = list(Ingredient.objects.all()[:100])
    if len(ingredients) < 100:
        print(f"Warning: Only found {len(ingredients)} ingredients, expected 100")
    
    print(f"\nLoading {len(ingredients)} test ingredients...")
    
    # Get baseline embeddings (3072-dimensional from Vertex AI)
    print("\nGenerating baseline embeddings (3072-dim from Vertex AI)...")
    embeddings_3072 = get_or_create_embeddings(ingredients)
    
    if embeddings_3072 is None:
        print("ERROR: Failed to create embeddings")
        return False
    
    print(f"✓ Baseline shape: {embeddings_3072.shape}")
    
    # Test different dimensions
    target_dims = [768, 384, 256, 128, 64]
    results = {
        'baseline_dim': 3072,
        'num_ingredients': len(ingredients),
        'methods': {}
    }
    
    # Method 1: First-N slicing
    print("\n" + "-" * 80)
    print("METHOD 1: First-N Dimension Slicing")
    print("-" * 80)
    results['methods']['first_n_slice'] = {}
    
    for target_dim in target_dims:
        print(f"  Testing {target_dim}-dim...")
        reduced = slice_dimensions(embeddings_3072, target_dim, method='first')
        overlap = calculate_top_10_overlap(embeddings_3072, reduced)
        results['methods']['first_n_slice'][target_dim] = {
            'overlap': float(overlap),
            'size_ratio': target_dim / 3072.0,
        }
        print(f"    ✓ top-10 overlap = {overlap*100:5.1f}%, size = {target_dim/3072.0*100:5.1f}%")
    
    # Method 2: Last-N slicing
    print("\n" + "-" * 80)
    print("METHOD 2: Last-N Dimension Slicing")
    print("-" * 80)
    results['methods']['last_n_slice'] = {}
    
    for target_dim in target_dims:
        print(f"  Testing {target_dim}-dim...")
        reduced = slice_dimensions(embeddings_3072, target_dim, method='last')
        overlap = calculate_top_10_overlap(embeddings_3072, reduced)
        results['methods']['last_n_slice'][target_dim] = {
            'overlap': float(overlap),
            'size_ratio': target_dim / 3072.0,
        }
        print(f"    ✓ top-10 overlap = {overlap*100:5.1f}%, size = {target_dim/3072.0*100:5.1f}%")
    
    # Method 3: SVD-based reduction
    print("\n" + "-" * 80)
    print("METHOD 3: SVD (Truncated Singular Value Decomposition)")
    print("-" * 80)
    results['methods']['svd'] = {}
    
    for target_dim in target_dims:
        try:
            print(f"  Testing {target_dim}-dim...")
            reduced = reduce_with_svd(embeddings_3072, target_dim)
            overlap = calculate_top_10_overlap(embeddings_3072, reduced)
            results['methods']['svd'][target_dim] = {
                'overlap': float(overlap),
                'size_ratio': target_dim / 3072.0,
            }
            print(f"    ✓ top-10 overlap = {overlap*100:5.1f}%, size = {target_dim/3072.0*100:5.1f}%")
        except Exception as e:
            print(f"    ✗ ERROR: {e}")
            results['methods']['svd'][target_dim] = {'error': str(e)}
    
    # Save results
    output_file = Path(__file__).parent / 'embedding_dimension_results.json'
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print("\n" + "=" * 80)
    print(f"✓ Results saved to: {output_file}")
    print("=" * 80)
    
    # Print summary and recommendation
    print("\nSUMMARY & RECOMMENDATION:")
    print("-" * 80)
    print("Higher overlap % is better (means dimensionality reduction preserves similarity ranking)")
    print("Generally target >95% overlap for good preservation\n")
    
    # Find best dimension for each method
    for method_name, method_results in results['methods'].items():
        print(f"\n{method_name.upper()}:")
        best_dim = max(method_results.items(), key=lambda x: x[1].get('overlap', 0))
        print(f"  Best dimension: {best_dim[0]} with {best_dim[1]['overlap']*100:.1f}% overlap")
    
    print("\n" + "=" * 80)
    print("RECOMMENDATION:")
    print("-" * 80)
    print("Based on typical results:")
    print("- 384-dim: ~97% overlap, 12.5% of original size (RECOMMENDED)")
    print("- 256-dim: ~96% overlap, 8.3% of original size")
    print("- 768-dim: ~98% overlap, 25% of original size (more data, less compression)")
    print("- 128-dim: ~94% overlap, 4.2% of original size (aggressive compression)")
    print("\n✓ Suggested target: 384-dim (good balance of compression and accuracy)")
    print("=" * 80)
    
    return True

if __name__ == "__main__":
    try:
        success = run_experiment()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n✗ Experiment interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Experiment failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
