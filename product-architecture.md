Product Architecture Document
Home Workout: Training, Technique, Recovery & Nutrition

Status: Draft v1.0
Product vision: Help users train the right muscles with appropriate exercises, understand correct technique, recover thoughtfully, and make practical food choices.

1. Product problem

Many fitness applications offer exercise lists without connecting the entire workout experience. Users may struggle to decide which exercises suit a target muscle, whether to use free weights or machines, how to execute movements safely, which muscles need stretching afterward, and what to eat around training.

Home Workout brings these activities together in a single guided journey.

2. Target users
Beginner

Needs clear instructions, simple workout plans, manageable progressions, and approachable demonstrations.

Intermediate trainee

Wants exercise variety, muscle-specific programming, equipment alternatives, and training history.

Gym user

Needs machine and free-weight options, adjustable sets and repetitions, rest guidance, and performance logging.

Home trainee

Needs substitutions based on dumbbells, resistance bands, bodyweight, or limited equipment.

Budget-conscious user

Wants realistic meal suggestions using affordable, familiar local foods alongside international alternatives.

3. Product principles
Muscle-first discovery: Users can begin with the muscle group they want to train.
Equipment flexibility: Recommend practical alternatives rather than assuming access to a fully equipped gym.
Technique before intensity: Form instructions should be easy to understand and access during training.
Training and recovery together: Each workout includes an appropriate cooldown pathway.
Nutrition that fits real life: Use ordinary foods, flexible substitutions, and transparent nutritional estimates.
Progress without pressure: Encourage consistency and sustainable progression.
Evidence-aware guidance: Distinguish general fitness education from medical or individualized professional advice.
4. Information architecture
Home
├── Dashboard
├── Start a Workout
│   ├── Select Muscle Group
│   ├── Select Goal
│   ├── Select Equipment
│   ├── Choose Workout
│   └── Guided Workout Session
│       ├── Exercise Demonstration
│       ├── Sets, Reps & Rest
│       └── Workout Summary
├── Exercise Library
│   ├── Muscle Groups
│   ├── Free Weights
│   ├── Machines
│   ├── Bodyweight
│   └── Exercise Details
├── Recovery
│   ├── Recommended Stretches
│   └── Guided Cooldown
├── Nutrition
│   ├── Pre-Workout Meals
│   ├── Post-Workout Meals
│   ├── Local Foods
│   └── International Foods
├── Progress
└── Settings & Preferences

5. Primary user journey
The user opens the dashboard and selects a training goal.
The user chooses a target muscle group, such as chest, back, shoulders, arms, legs, or core.
The user selects available equipment and their experience level.
The product generates a balanced workout with exercise order, sets, repetitions, and rest guidance.
Before starting each exercise, the user views an animation and reads setup and technique cues.
The user records sets and repetitions, with optional load tracking.
At completion, the product identifies the muscles trained and builds a cooldown sequence.
The product recommends suitable pre-workout or post-workout food based on the selected meal context.
The user saves the session and reviews progress.

The journey should allow users to skip optional nutrition suggestions, substitute exercises, and adjust a workout without losing their session.

6. Muscle-group and exercise architecture

The exercise library should distinguish primary muscles from secondary muscles.

Initial muscle groups:

Chest
Back
Shoulders
Biceps
Triceps
Forearms
Quadriceps
Hamstrings
Glutes
Calves
Abdominals and obliques

Each group should offer suitable free-weight, machine, and bodyweight options where appropriate.

Examples:

Muscle group	Free-weight examples	Machine examples
Chest	Dumbbell bench press, dumbbell fly	Chest press, pec deck
Back	Dumbbell row, barbell row	Lat pulldown, seated cable row
Shoulders	Dumbbell shoulder press, lateral raise	Shoulder press machine, lateral raise machine
Biceps	Dumbbell curl, hammer curl	Biceps curl machine, cable curl
Triceps	Dumbbell extension, close-grip press	Cable pushdown, triceps extension machine
Quadriceps	Goblet squat, split squat	Leg extension, leg press
Hamstrings	Dumbbell Romanian deadlift	Seated or lying leg curl
Glutes	Dumbbell hip thrust, split squat	Glute drive or suitable cable movement
Calves	Standing dumbbell calf raise	Standing or seated calf raise machine
Core	Weighted crunch, controlled plank variations	Abdominal crunch machine, cable crunch

These are catalogue examples, not a claim that all exercises are equally suitable for every person. Exercise selection must account for technique, mobility, experience, available equipment, and individual limitations.

7. Exercise detail page

Every exercise page should include:

Exercise name and target muscles.
Equipment and difficulty.
Animation or approved demonstration video.
Setup instructions.
Numbered execution steps.
Breathing and bracing guidance.
Common mistakes and corrections.
Suggested sets, repetitions, and rest.
Alternative exercises.
Relevant safety notes.
Animation interaction

The user should be able to:

Play, pause, and replay the demonstration.
Slow the movement where supported.
View setup and execution separately.
Read step-by-step cues.
Switch to a text-only version.
See the movement from an additional angle where available.

Do not use a decorative animation that fails to demonstrate the actual movement. Exercise and stretch demonstrations should be reviewed before publication.

8. Recovery and stretch recommendations

At the end of a session, show the muscles trained and the corresponding stretches.

Examples include:

Worked muscles	Possible cooldown stretches
Chest	Gentle doorway chest stretch
Back and lats	Comfortable lat stretch
Shoulders	Cross-body shoulder stretch
Biceps	Gentle arm-extension stretch
Triceps	Overhead triceps stretch
Quadriceps	Standing or side-lying quad stretch
Hamstrings	Supine hamstring stretch
Glutes	Figure-four glute stretch
Calves	Wall calf stretch
Core	Gentle, comfortable abdominal extension if appropriate

These mappings are starting points. The actual cooldown must account for the movements performed, individual comfort, and any restrictions. Stretches should be gentle, controlled, and never forced into painful ranges.

Recovery user experience
Display a short cooldown summary.
Show the target muscle and stretch animation.
Provide a suggested hold duration and breathing cues.
Offer alternatives for limited mobility or uncomfortable positions.
Allow the user to mark a stretch complete or skip it.
Save cooldown completion with the workout record.

The product should describe stretching as one component of recovery, not a guarantee against soreness or injury.

9. Nutrition product architecture

Nutrition should be organized around the workout rather than presenting an overwhelming generic diet plan.

Pre-workout

Offer food suggestions that prioritize digestible carbohydrates and, when practical, protein. Account for the time remaining before training and the user's tolerance.

Examples:

Kenyan and East African options

Banana and milk.
Sweet potato with eggs.
Oats or uji with milk, prepared to the user's preferences.
Bread with peanut butter.

International options

Oatmeal with fruit.
Yogurt with banana.
Toast with eggs.
Rice with a modest serving of lean protein when there is sufficient time to digest.
Post-workout

Suggest a combination of protein, carbohydrates, and appropriate fluids.

Kenyan and East African options

Ugali, sukuma wiki, and fish or chicken.
Githeri with an additional protein source if needed.
Rice with beans or ndengu.
Eggs with potatoes or sweet potatoes.
Milk or fermented milk alongside a suitable meal.

International options

Rice with chicken or tofu.
Yogurt with oats and fruit.
Eggs with whole-grain toast.
Beans with potatoes or rice.
Fish with potatoes and vegetables.

The product must not assume that a particular food is available, affordable, or culturally appropriate for every user.

Nutrition filters
Local or international foods.
Vegetarian or vegan.
Food allergies and declared exclusions.
Budget range.
Preparation time.
Meal timing.
User-selected goal.

Show approximate portion sizes and nutrition estimates when reliable data is available. Make clear that food examples are general educational suggestions, not a medical diet or a guarantee of performance.

10. Core screens and acceptance criteria
Dashboard
Start a workout.
Resume an unfinished session.
View recent workouts and progress.
Access recovery and nutrition.
Workout builder
Select muscles, goal, experience, equipment, and duration.
Display relevant exercises and alternatives.
Explain why the exercises were selected.
Guided workout
Show the current exercise and its animation.
Track sets, repetitions, load, and rest.
Support substitutions without resetting the whole session.
Recovery
Match stretches to muscles worked.
Provide reviewed animations and instructions.
Track completion and offer alternatives.
Nutrition
Show pre- and post-workout suggestions.
Offer local and international foods.
Display serving guidance and known nutrition estimates.
Respect allergies and declared preferences.
Progress
Show workout history and training consistency.
Track performance changes.
Provide a clear distinction between logged data and estimates.
11. MVP scope and exclusions

MVP includes:

Responsive application.
Curated exercise and muscle catalogue.
Machine and free-weight alternatives.
Basic personalized workout generation.
Exercise and stretch demonstrations.
Workout logging.
Muscle-specific cooldowns.
Local and international meal suggestions.
Basic history and progress.

Defer until later:

AI-generated personalized coaching.
Automated pose estimation and real-time form correction.
Wearable integrations.
Social feeds and leaderboards.
Paid subscriptions and advanced coaching marketplaces.
Clinical nutrition or injury-rehabilitation plans.
12. Product success metrics

Track measurable outcomes such as:

Percentage of users who generate and complete a workout.
Workout completion rate.
Percentage of completed sessions with a cooldown.
Animation playback and exercise-detail engagement.
Exercise substitution frequency.
Repeat weekly usage.
User feedback on exercise clarity and meal usefulness.
Error rate and animation loading performance.

Use these measures to improve usability and adherence, not to make unsupported health-outcome claims.

13. Definition of product success

A user should be able to choose a muscle group, obtain an appropriate workout using available equipment, understand how to perform every exercise, complete a relevant cooldown, and receive practical food suggestions without needing to switch between several unrelated tools.