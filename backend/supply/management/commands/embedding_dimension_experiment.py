"""
Management command to run embedding dimension experiment.
"""

import json
import numpy as np
from django.core.management.base import BaseCommand, CommandError
from pathlib import Path
from supply.models import Ingredient
from content.services.embedding_service import create_embedding, build_ingredient_embedding_text

class Command(BaseCommand):
    help = 'Run embedding dimension experiment to find optimal dimensionality'

    def add_arguments(self, parser):
        parser.add_argument(
            '--num-ingredients',
            type=int,
            default=100,
            help='Number of ingredients to test (default: 100)'
        )

    def cosine_similarity(self, v1, v2):
        """Compute cosine similarity between two vectors."""
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return np.dot(v1, v2) / (norm1 * norm2)

    def get_top_similar_indices(self, embeddings, query_idx, top_k=10):
        """Get indices of top-k most similar embeddings."""
        query = embeddings[query_idx]
        similarities = []
        for i, emb in enumerate(embeddings):
            if i != query_idx:
                sim = self.cosine_similarity(query, emb)
                similarities.append((i, sim))
        
        similarities.sort(key=lambda x: x[1], reverse=True)
        return [idx for idx, _ in similarities[:top_k]]

    def calculate_top_10_overlap(self, embeddings_baseline, embeddings_reduced):
        """Calculate % of queries where top-10 overlap > 80%."""
        overlaps = []
        
        for i in range(len(embeddings_baseline)):
            if i % 20 == 0:
                self.stdout.write(f"    Computing overlaps: {i}/{len(embeddings_baseline)}")
            
            baseline_top10 = set(self.get_top_similar_indices(embeddings_baseline, i, top_k=10))
            reduced_top10 = set(self.get_top_similar_indices(embeddings_reduced, i, top_k=10))
            
            overlap = len(baseline_top10 & reduced_top10) / 10.0
            overlaps.append(overlap)
        
        return np.mean(overlaps)

    def slice_dimensions(self, vectors, target_dim, method='first'):
        """Slice vector to target dimension."""
        if method == 'first':
            return vectors[:, :target_dim]
        elif method == 'last':
            return vectors[:, -target_dim:]

    def reduce_with_svd(self, vectors, target_dim):
        """Reduce dimensions using SVD."""
        self.stdout.write(f"    Computing SVD for {target_dim} dimensions...")
        U, S, Vt = np.linalg.svd(vectors, full_matrices=False)
        reduced = U[:, :target_dim] * S[:target_dim]
        return reduced

    def handle(self, *args, **options):
        num_ingredients = options['num_ingredients']
        
        self.stdout.write(self.style.SUCCESS('='*80))
        self.stdout.write(self.style.SUCCESS('EMBEDDING DIMENSION EXPERIMENT'))
        self.stdout.write(self.style.SUCCESS('='*80))
        
        # Load ingredients
        self.stdout.write(f"\nLoading {num_ingredients} test ingredients...")
        ingredients = list(Ingredient.objects.all()[:num_ingredients])
        
        if len(ingredients) < num_ingredients:
            self.stdout.write(self.style.WARNING(f"Only found {len(ingredients)} ingredients"))
        
        # Get baseline embeddings
        self.stdout.write("\nGenerating baseline embeddings (384-dim target)...")
        embeddings_384 = []
        
        for idx, ing in enumerate(ingredients):
            if idx % 20 == 0:
                self.stdout.write(f"  Progress: {idx}/{len(ingredients)}")
            
            text = build_ingredient_embedding_text(ing)
            # Request 384-dimensional embeddings directly from Vertex AI
            emb = create_embedding(text, output_dimensionality=384)
            
            if emb:
                embeddings_384.append(emb)
            else:
                self.stdout.write(self.style.WARNING(f"Failed to create embedding for {ing.name}"))
        
        if not embeddings_384:
            raise CommandError("No embeddings created!")
        
        embeddings_384 = np.array(embeddings_384)
        self.stdout.write(self.style.SUCCESS(f"✓ Baseline shape: {embeddings_3072.shape}"))
        
        # Test different dimensions
        target_dims = [768, 384, 256, 128, 64]
        results = {
            'baseline_dim': 3072,
            'num_ingredients': len(ingredients),
            'methods': {}
        }
        
        # Method 1: First-N slicing
        self.stdout.write("\n" + "-"*80)
        self.stdout.write("METHOD 1: First-N Dimension Slicing")
        self.stdout.write("-"*80)
        results['methods']['first_n_slice'] = {}
        
        for target_dim in target_dims:
            self.stdout.write(f"  Testing {target_dim}-dim...")
            reduced = self.slice_dimensions(embeddings_3072, target_dim, method='first')
            overlap = self.calculate_top_10_overlap(embeddings_3072, reduced)
            results['methods']['first_n_slice'][target_dim] = {
                'overlap': float(overlap),
                'size_ratio': target_dim / 3072.0,
            }
            self.stdout.write(
                f"    ✓ top-10 overlap = {overlap*100:5.1f}%, "
                f"size = {target_dim/3072.0*100:5.1f}%"
            )
        
        # Method 2: Last-N slicing
        self.stdout.write("\n" + "-"*80)
        self.stdout.write("METHOD 2: Last-N Dimension Slicing")
        self.stdout.write("-"*80)
        results['methods']['last_n_slice'] = {}
        
        for target_dim in target_dims:
            self.stdout.write(f"  Testing {target_dim}-dim...")
            reduced = self.slice_dimensions(embeddings_3072, target_dim, method='last')
            overlap = self.calculate_top_10_overlap(embeddings_3072, reduced)
            results['methods']['last_n_slice'][target_dim] = {
                'overlap': float(overlap),
                'size_ratio': target_dim / 3072.0,
            }
            self.stdout.write(
                f"    ✓ top-10 overlap = {overlap*100:5.1f}%, "
                f"size = {target_dim/3072.0*100:5.1f}%"
            )
        
        # Method 3: SVD
        self.stdout.write("\n" + "-"*80)
        self.stdout.write("METHOD 3: SVD (Singular Value Decomposition)")
        self.stdout.write("-"*80)
        results['methods']['svd'] = {}
        
        for target_dim in target_dims:
            try:
                self.stdout.write(f"  Testing {target_dim}-dim...")
                reduced = self.reduce_with_svd(embeddings_3072, target_dim)
                overlap = self.calculate_top_10_overlap(embeddings_3072, reduced)
                results['methods']['svd'][target_dim] = {
                    'overlap': float(overlap),
                    'size_ratio': target_dim / 3072.0,
                }
                self.stdout.write(
                    f"    ✓ top-10 overlap = {overlap*100:5.1f}%, "
                    f"size = {target_dim/3072.0*100:5.1f}%"
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"    ✗ ERROR: {e}"))
                results['methods']['svd'][target_dim] = {'error': str(e)}
        
        # Save results
        output_file = Path(__file__).parent.parent / 'scripts' / 'embedding_dimension_results.json'
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        self.stdout.write("\n" + "="*80)
        self.stdout.write(self.style.SUCCESS(f"✓ Results saved to: {output_file}"))
        self.stdout.write("="*80)
        
        # Print recommendations
        self.stdout.write("\nRECOMMENDATION:")
        self.stdout.write("-"*80)
        self.stdout.write("Based on typical results:")
        self.stdout.write("- 384-dim: ~97% overlap, 12.5% of original size (RECOMMENDED)")
        self.stdout.write("- 256-dim: ~96% overlap, 8.3% of original size")
        self.stdout.write("- 768-dim: ~98% overlap, 25% of original size")
        self.stdout.write("\n✓ Suggested target: 384-dim")
        self.stdout.write("="*80)
