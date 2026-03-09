
type Facets = {
    mind: { introverted: number, extraverted: number };
    energy: { intuitive: number, observant: number };
    nature: { thinking: number, feeling: number };
    tactics: { judging: number, prospecting: number };
    identity: { assertive: number, turbulent: number };
};

type BigFive = {
  personality_openness: number;
  personality_conscientiousness: number;
  personality_extraversion: number;
  personality_agreeableness: number;
  personality_neuroticism: number;
};


// These are approximate mappings for demonstration purposes.
// The relationship between these systems is complex and debated.
const mbtiMap: Record<string, Facets> = {
    "INTJ": { mind: { introverted: 85, extraverted: 15 }, energy: { intuitive: 80, observant: 20 }, nature: { thinking: 75, feeling: 25 }, tactics: { judging: 80, prospecting: 20 }, identity: { assertive: 60, turbulent: 40 } },
    "INTP": { mind: { introverted: 80, extraverted: 20 }, energy: { intuitive: 90, observant: 10 }, nature: { thinking: 70, feeling: 30 }, tactics: { judging: 25, prospecting: 75 }, identity: { assertive: 40, turbulent: 60 } },
    "ENTJ": { mind: { introverted: 30, extraverted: 70 }, energy: { intuitive: 75, observant: 25 }, nature: { thinking: 85, feeling: 15 }, tactics: { judging: 85, prospecting: 15 }, identity: { assertive: 70, turbulent: 30 } },
    "ENTP": { mind: { introverted: 35, extraverted: 65 }, energy: { intuitive: 85, observant: 15 }, nature: { thinking: 60, feeling: 40 }, tactics: { judging: 30, prospecting: 70 }, identity: { assertive: 55, turbulent: 45 } },
    "INFJ": { mind: { introverted: 75, extraverted: 25 }, energy: { intuitive: 85, observant: 15 }, nature: { thinking: 35, feeling: 65 }, tactics: { judging: 70, prospecting: 30 }, identity: { assertive: 45, turbulent: 55 } },
    "INFP": { mind: { introverted: 80, extraverted: 20 }, energy: { intuitive: 90, observant: 10 }, nature: { thinking: 25, feeling: 75 }, tactics: { judging: 35, prospecting: 65 }, identity: { assertive: 30, turbulent: 70 } },
    "ENFJ": { mind: { introverted: 40, extraverted: 60 }, energy: { intuitive: 70, observant: 30 }, nature: { thinking: 30, feeling: 70 }, tactics: { judging: 65, prospecting: 35 }, identity: { assertive: 65, turbulent: 35 } },
    "ENFP": { mind: { introverted: 30, extraverted: 70 }, energy: { intuitive: 90, observant: 10 }, nature: { thinking: 40, feeling: 60 }, tactics: { judging: 30, prospecting: 70 }, identity: { assertive: 50, turbulent: 50 } },
    "ISTJ": { mind: { introverted: 70, extraverted: 30 }, energy: { intuitive: 20, observant: 80 }, nature: { thinking: 65, feeling: 35 }, tactics: { judging: 90, prospecting: 10 }, identity: { assertive: 65, turbulent: 35 } },
    "ISFJ": { mind: { introverted: 65, extraverted: 35 }, energy: { intuitive: 30, observant: 70 }, nature: { thinking: 40, feeling: 60 }, tactics: { judging: 80, prospecting: 20 }, identity: { assertive: 55, turbulent: 45 } },
    "ESTJ": { mind: { introverted: 25, extraverted: 75 }, energy: { intuitive: 25, observant: 75 }, nature: { thinking: 75, feeling: 25 }, tactics: { judging: 90, prospecting: 10 }, identity: { assertive: 80, turbulent: 20 } },
    "ESFJ": { mind: { introverted: 35, extraverted: 65 }, energy: { intuitive: 35, observant: 65 }, nature: { thinking: 35, feeling: 65 }, tactics: { judging: 75, prospecting: 25 }, identity: { assertive: 70, turbulent: 30 } },
    "ISTP": { mind: { introverted: 75, extraverted: 25 }, energy: { intuitive: 30, observant: 70 }, nature: { thinking: 80, feeling: 20 }, tactics: { judging: 20, prospecting: 80 }, identity: { assertive: 60, turbulent: 40 } },
    "ISFP": { mind: { introverted: 70, extraverted: 30 }, energy: { intuitive: 40, observant: 60 }, nature: { thinking: 30, feeling: 70 }, tactics: { judging: 25, prospecting: 75 }, identity: { assertive: 40, turbulent: 60 } },
    "ESTP": { mind: { introverted: 20, extraverted: 80 }, energy: { intuitive: 30, observant: 70 }, nature: { thinking: 70, feeling: 30 }, tactics: { judging: 20, prospecting: 80 }, identity: { assertive: 75, turbulent: 25 } },
    "ESFP": { mind: { introverted: 20, extraverted: 80 }, energy: { intuitive: 35, observant: 65 }, nature: { thinking: 45, feeling: 55 }, tactics: { judging: 30, prospecting: 70 }, identity: { assertive: 65, turbulent: 35 } },
};

// Expanded mapping with values for all facets for a fluid experience.
const enneagramMap: Record<string, Facets> = {
    "Tipo 1": { mind: { introverted: 60, extraverted: 40 }, energy: { intuitive: 40, observant: 60 }, nature: { thinking: 60, feeling: 40 }, tactics: { judging: 85, prospecting: 15 }, identity: { assertive: 50, turbulent: 50 } },
    "Tipo 2": { mind: { introverted: 40, extraverted: 60 }, energy: { intuitive: 50, observant: 50 }, nature: { thinking: 30, feeling: 70 }, tactics: { judging: 60, prospecting: 40 }, identity: { assertive: 40, turbulent: 60 } },
    "Tipo 3": { mind: { introverted: 35, extraverted: 65 }, energy: { intuitive: 50, observant: 50 }, nature: { thinking: 50, feeling: 50 }, tactics: { judging: 70, prospecting: 30 }, identity: { assertive: 80, turbulent: 20 } },
    "Tipo 4": { mind: { introverted: 70, extraverted: 30 }, energy: { intuitive: 80, observant: 20 }, nature: { thinking: 40, feeling: 60 }, tactics: { judging: 40, prospecting: 60 }, identity: { assertive: 20, turbulent: 80 } },
    "Tipo 5": { mind: { introverted: 90, extraverted: 10 }, energy: { intuitive: 85, observant: 15 }, nature: { thinking: 80, feeling: 20 }, tactics: { judging: 50, prospecting: 50 }, identity: { assertive: 50, turbulent: 50 } },
    "Tipo 6": { mind: { introverted: 55, extraverted: 45 }, energy: { intuitive: 45, observant: 55 }, nature: { thinking: 50, feeling: 50 }, tactics: { judging: 65, prospecting: 35 }, identity: { assertive: 30, turbulent: 70 } },
    "Tipo 7": { mind: { introverted: 25, extraverted: 75 }, energy: { intuitive: 80, observant: 20 }, nature: { thinking: 55, feeling: 45 }, tactics: { judging: 20, prospecting: 80 }, identity: { assertive: 60, turbulent: 40 } },
    "Tipo 8": { mind: { introverted: 30, extraverted: 70 }, energy: { intuitive: 40, observant: 60 }, nature: { thinking: 75, feeling: 25 }, tactics: { judging: 75, prospecting: 25 }, identity: { assertive: 85, turbulent: 15 } },
    "Tipo 9": { mind: { introverted: 60, extraverted: 40 }, energy: { intuitive: 40, observant: 60 }, nature: { thinking: 40, feeling: 60 }, tactics: { judging: 30, prospecting: 70 }, identity: { assertive: 30, turbulent: 70 } },
};

export const mapMbtiToFacets = (mbtiType: string): Facets | undefined => {
    return mbtiMap[mbtiType];
};

export const mapEnneagramToFacets = (enneagramType: string): Facets | undefined => {
    return enneagramMap[enneagramType];
};

export const mapFacetsToBigFive = (facets: {
    mind: { extraverted: number };
    energy: { intuitive: number };
    nature: { feeling: number };
    tactics: { judging: number };
    identity: { turbulent: number };
}): BigFive => {
    const openness = facets.energy.intuitive ?? 50;
    const conscientiousness = facets.tactics.judging ?? 50;
    const extraversion = facets.mind.extraverted ?? 50;
    const agreeableness = facets.nature.feeling ?? 50;
    const neuroticism = facets.identity.turbulent ?? 50;

    return {
        personality_openness: Math.round(openness),
        personality_conscientiousness: Math.round(conscientiousness),
        personality_extraversion: Math.round(extraversion),
        personality_agreeableness: Math.round(agreeableness),
        personality_neuroticism: Math.round(neuroticism),
    };
};

    
