// utils/scoreCalculator.js

// Function to calculate section-wise scores and overall score
function calculateScores(answers) {
    const maxScores = {
        personalHealthHabits: 100,
        mentalEmotionalWellBeing: 100,
        nutrition: 100,
        physicalActivity: 100
    };

    // Initialize section scores
    let sectionScores = {
        personalHealthHabits: 0,
        mentalEmotionalWellBeing: 0,
        nutrition: 0,
        physicalActivity: 0
    };

    // Calculate the section-wise scores
    answers.forEach(answer => {
        const { questionId, score } = answer;

        // Map question IDs to their respective sections.
        if (questionId >= 1 && questionId <= 10) {
            sectionScores.personalHealthHabits += score;
        } else if (questionId >= 11 && questionId <= 20) {
            sectionScores.mentalEmotionalWellBeing += score;
        } else if (questionId >= 21 && questionId <= 30) {
            sectionScores.nutrition += score;
        } else if (questionId >= 31 && questionId <= 40) {
            sectionScores.physicalActivity += score;
        }
    });

    // Calculate the total score
    const totalScore = Object.values(sectionScores).reduce((acc, val) => acc + val, 0);
    const maxTotalScore = Object.values(maxScores).reduce((acc, val) => acc + val, 0);

    // Calculate the percentage score
    const percentageScore = (totalScore / maxTotalScore) * 100;

    // Determine the risk category based on the percentage score
    let riskCategory;
    if (percentageScore >= 80) {
        riskCategory = "Low";
    } else if (percentageScore >= 60) {
        riskCategory = "Moderate";
    } else if (percentageScore >= 40) {
        riskCategory = "High";
    } else if (percentageScore >= 20) {
        riskCategory = "Very High";
    } else {
        riskCategory = "Severe";
    }

    // Return the calculated scores and risk category
    return {
        sectionScores,
        totalScore,
        percentageScore,
        riskCategory
    };
}

module.exports = calculateScores;
