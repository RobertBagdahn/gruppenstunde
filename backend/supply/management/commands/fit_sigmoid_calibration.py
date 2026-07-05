"""
Management command to collect ground-truth ingredient pairs and validate sigmoid calibration.

This identifies pairs that should be similar vs. dissimilar, measures their
cosine similarity, and validates the sigmoid calibration against them.
"""

import json
import numpy as np
from django.core.management.base import BaseCommand, CommandError
from pathlib import Path
from supply.models import Ingredient
from content.services.embedding_service import (
    build_ingredient_embedding_text,
    create_embedding,
    similarity_to_pct,
)

class Command(BaseCommand):
    help = 'Collect ground-truth pairs and fit sigmoid calibration parameters'

    def cosine_similarity(self, v1, v2):
        """Compute cosine similarity between two vectors."""
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return np.dot(v1, v2) / (norm1 * norm2)

    def collect_ground_truth_pairs(self):
        """Collect manually-defined ground-truth ingredient pairs."""
        
        # Pairs that should have LOW similarity (<50%)
        should_be_different = [
            ("Schweinebauch", "Bacon"),
            ("Schweinebauch", "Schweinefleisch"),
            ("Rote Zwiebel", "Kartoffel"),
            ("Paprika rot", "Paprika-Pulver"),
            ("Tomato", "Apfel"),
            ("Butter", "Öl"),
            ("Milch", "Wasser"),
        ]
        
        # Pairs that should have HIGH similarity (>80%)
        should_be_similar = [
            ("Möhren", "Karotten"),
            ("Zwiebel", "Rote Zwiebel"),
            ("Tomate", "Tomato"),
            ("Kartoffel", "Kartoffeln"),
            ("Knoblauch", "Knoblauchzehe"),
        ]
        
        pairs = []
        
        self.stdout.write("\n" + "="*80)
        self.stdout.write("COLLECTING GROUND-TRUTH PAIRS")
        self.stdout.write("="*80)
        
        # Process "different" pairs
        self.stdout.write("\n[LOW SIMILARITY] Pairs that should NOT be duplicates:")
        self.stdout.write("-"*80)
        for name_a, name_b in should_be_different:
            ing_a = Ingredient.objects.filter(name__icontains=name_a).first()
            ing_b = Ingredient.objects.filter(name__icontains=name_b).first()
            
            if ing_a and ing_b:
                pairs.append({
                    'ing_a_id': ing_a.id,
                    'ing_a_name': ing_a.name,
                    'ing_b_id': ing_b.id,
                    'ing_b_name': ing_b.name,
                    'should_be_similar': False,
                    'target_pct': 30.0,  # Target < 50%
                })
                self.stdout.write(f"✓ {ing_a.name} <-> {ing_b.name}")
            else:
                self.stdout.write(f"✗ Not found: {name_a} or {name_b}")
        
        # Process "similar" pairs
        self.stdout.write("\n[HIGH SIMILARITY] Pairs that SHOULD be duplicates:")
        self.stdout.write("-"*80)
        for name_a, name_b in should_be_similar:
            ing_a = Ingredient.objects.filter(name__icontains=name_a).first()
            ing_b = Ingredient.objects.filter(name__icontains=name_b).first()
            
            if ing_a and ing_b:
                pairs.append({
                    'ing_a_id': ing_a.id,
                    'ing_a_name': ing_a.name,
                    'ing_b_id': ing_b.id,
                    'ing_b_name': ing_b.name,
                    'should_be_similar': True,
                    'target_pct': 85.0,  # Target > 80%
                })
                self.stdout.write(f"✓ {ing_a.name} <-> {ing_b.name}")
            else:
                self.stdout.write(f"✗ Not found: {name_a} or {name_b}")
        
        self.stdout.write(f"\n✓ Collected {len(pairs)} ground-truth pairs")
        return pairs

    def get_embeddings_for_pairs(self, pairs):
        """Get embeddings for all pair ingredients."""
        self.stdout.write("\nGenerating embeddings for ground-truth pairs...")
        self.stdout.write("-"*80)
        
        embeddings = {}
        
        for idx, pair in enumerate(pairs):
            if idx % 5 == 0:
                self.stdout.write(f"  Progress: {idx}/{len(pairs)}")
            
            # Get embedding for ing_a
            ing_a = Ingredient.objects.get(id=pair['ing_a_id'])
            if ing_a.id not in embeddings:
                text_a = build_ingredient_embedding_text(ing_a)
                emb_a = create_embedding(text_a, output_dimensionality=384)
                if emb_a:
                    embeddings[ing_a.id] = emb_a
            
            # Get embedding for ing_b
            ing_b = Ingredient.objects.get(id=pair['ing_b_id'])
            if ing_b.id not in embeddings:
                text_b = build_ingredient_embedding_text(ing_b)
                emb_b = create_embedding(text_b, output_dimensionality=384)
                if emb_b:
                    embeddings[ing_b.id] = emb_b
        
        self.stdout.write(f"✓ Generated {len(embeddings)} embeddings")
        return embeddings

    def calculate_pair_similarities(self, pairs, embeddings):
        """Calculate cosine similarity for all pairs."""
        self.stdout.write("\nCalculating cosine similarities...")
        self.stdout.write("-"*80)
        
        pair_data = []
        
        for pair in pairs:
            ing_a_id = pair['ing_a_id']
            ing_b_id = pair['ing_b_id']
            
            if ing_a_id in embeddings and ing_b_id in embeddings:
                cosine_sim = self.cosine_similarity(
                    embeddings[ing_a_id],
                    embeddings[ing_b_id]
                )
                
                pair_data.append({
                    'ing_a_name': pair['ing_a_name'],
                    'ing_b_name': pair['ing_b_name'],
                    'cosine_sim': float(cosine_sim),
                    'should_be_similar': pair['should_be_similar'],
                    'target_pct': pair['target_pct'],
                })
                
                label = "SIMILAR" if pair['should_be_similar'] else "DIFFERENT"
                self.stdout.write(
                    f"  [{label}] {pair['ing_a_name']} <-> {pair['ing_b_name']}: "
                    f"{cosine_sim:.4f} (target: {pair['target_pct']:.0f}%)"
                )
        
        return pair_data

    def fit_sigmoid_parameters(self, pair_data):
        """Validate and optimize sigmoid parameters against ground-truth pairs."""
        self.stdout.write("\n" + "="*80)
        self.stdout.write("OPTIMIZING SIGMOID CALIBRATION")
        self.stdout.write("="*80)
        
        # Extract cosine similarities and target percentages
        cosine_sims = np.array([p['cosine_sim'] for p in pair_data])
        target_pcts = np.array([p['target_pct'] for p in pair_data])
        
        # Define sigmoid function
        def sigmoid(x, steepness, midpoint):
            return 100.0 / (1.0 + np.exp(-steepness * (x - midpoint)))
        
        # Calculate MSE for given parameters
        def calc_mse(steepness, midpoint):
            predictions = sigmoid(cosine_sims, steepness, midpoint)
            return np.mean((predictions - target_pcts) ** 2)
        
        # Grid search for best parameters (simple optimization without scipy)
        self.stdout.write(f"\nPerforming grid search for optimal parameters...")
        
        best_mse = float('inf')
        best_steepness = 10.0
        best_midpoint = 0.6
        
        # Try different parameter combinations
        for steepness in np.linspace(5, 20, 16):
            for midpoint in np.linspace(0.5, 0.8, 16):
                mse = calc_mse(steepness, midpoint)
                if mse < best_mse:
                    best_mse = mse
                    best_steepness = steepness
                    best_midpoint = midpoint
        
        # Refine around best parameters
        for steepness in np.linspace(best_steepness - 1, best_steepness + 1, 10):
            for midpoint in np.linspace(best_midpoint - 0.05, best_midpoint + 0.05, 10):
                mse = calc_mse(steepness, midpoint)
                if mse < best_mse:
                    best_mse = mse
                    best_steepness = steepness
                    best_midpoint = midpoint
        
        self.stdout.write(self.style.SUCCESS(f"\n✓ Optimization complete!"))
        self.stdout.write(f"  Best parameters: steepness={best_steepness:.2f}, midpoint={best_midpoint:.3f}")
        self.stdout.write(f"  MSE: {best_mse:.4f}")
        
        # Calculate R²
        predictions = sigmoid(cosine_sims, best_steepness, best_midpoint)
        ss_res = np.sum((target_pcts - predictions) ** 2)
        ss_tot = np.sum((target_pcts - np.mean(target_pcts)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
        self.stdout.write(f"  R² Score: {r_squared:.4f}")
        
        return best_steepness, best_midpoint, r_squared

    def validate_fit(self, pair_data, steepness, midpoint):
        """Validate sigmoid fit against ground-truth pairs."""
        self.stdout.write("\n" + "="*80)
        self.stdout.write("VALIDATION RESULTS")
        self.stdout.write("="*80)
        
        self.stdout.write("\nPredicted vs. Target (using sigmoid):")
        self.stdout.write("-"*80)
        
        correct_direction = 0
        max_error = 0.0
        
        for pair in pair_data:
            cosine = pair['cosine_sim']
            target = pair['target_pct']
            predicted = similarity_to_pct(cosine, steepness=steepness, midpoint=midpoint)
            
            # Check if prediction is in right direction
            if pair['should_be_similar']:  # Should be high (>80%)
                is_correct = predicted > 70
            else:  # Should be low (<50%)
                is_correct = predicted < 50
            
            if is_correct:
                correct_direction += 1
                status = "✓"
            else:
                status = "✗"
            
            error = abs(predicted - target)
            max_error = max(max_error, error)
            
            self.stdout.write(
                f"{status} {pair['ing_a_name']:25s} <-> {pair['ing_b_name']:25s}: "
                f"predicted={predicted:5.1f}%, target={target:5.1f}%, error={error:5.1f}%"
            )
        
        accuracy = correct_direction / len(pair_data) * 100
        self.stdout.write(f"\n✓ Accuracy (correct direction): {accuracy:.1f}% ({correct_direction}/{len(pair_data)})")
        self.stdout.write(f"✓ Max error: {max_error:.1f}%")
        
        return accuracy

    def handle(self, *args, **options):
        """Main entry point."""
        # Step 1: Collect ground-truth pairs
        pairs = self.collect_ground_truth_pairs()
        
        if not pairs:
            raise CommandError("No ground-truth pairs found!")
        
        # Step 2: Get embeddings
        embeddings = self.get_embeddings_for_pairs(pairs)
        
        if not embeddings:
            raise CommandError("Failed to generate embeddings!")
        
        # Step 3: Calculate similarities
        pair_data = self.calculate_pair_similarities(pairs, embeddings)
        
        # Step 4: Fit sigmoid parameters
        steepness, midpoint, r_squared = self.fit_sigmoid_parameters(pair_data)
        
        if steepness is None:
            raise CommandError("Failed to fit sigmoid parameters!")
        
        # Step 5: Validate fit
        accuracy = self.validate_fit(pair_data, steepness, midpoint)
        
        # Step 6: Save results
        results = {
            'timestamp': str(__import__('datetime').datetime.now()),
            'num_pairs': len(pair_data),
            'sigmoid_parameters': {
                'steepness': float(steepness),
                'midpoint': float(midpoint),
            },
            'fit_quality': {
                'r_squared': float(r_squared),
                'accuracy_direction': float(accuracy),
            },
            'ground_truth_pairs': pair_data,
        }
        
        output_file = Path(__file__).parent.parent / 'scripts' / 'sigmoid_calibration_results.json'
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        self.stdout.write("\n" + "="*80)
        self.stdout.write(self.style.SUCCESS(f"✓ Results saved to: {output_file}"))
        self.stdout.write("="*80)
        
        self.stdout.write(f"\nRECOMMENDATION:")
        self.stdout.write("-"*80)
        if r_squared > 0.90 and accuracy > 90:
            self.stdout.write(self.style.SUCCESS(
                f"✓ Fit quality is excellent (R²={r_squared:.3f}, accuracy={accuracy:.1f}%)"
            ))
            self.stdout.write(f"\nUpdate embedding_service.py with:")
            self.stdout.write(f"  steepness = {steepness:.2f}")
            self.stdout.write(f"  midpoint = {midpoint:.2f}")
        elif r_squared > 0.80 and accuracy > 80:
            self.stdout.write(self.style.WARNING(
                f"⚠ Fit quality is good but could be better (R²={r_squared:.3f}, accuracy={accuracy:.1f}%)"
            ))
        else:
            self.stdout.write(self.style.ERROR(
                f"✗ Fit quality is poor (R²={r_squared:.3f}, accuracy={accuracy:.1f}%)"
            ))
            self.stdout.write("Consider collecting more ground-truth pairs or adjusting initial parameters")
