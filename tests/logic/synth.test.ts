import { describe, test, expect } from "bun:test";
import { scoreConfidence } from "../../src/logic/synth";
import type { SearchResult } from "../../src/logic/brave";

function makeSource(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    title: "Test Article",
    url: "https://example.com/test",
    snippet: "A detailed snippet about the search topic with enough content to be meaningful.",
    published: "2 hours ago",
    ...overrides,
  };
}

describe("scoreConfidence", () => {
  test("returns 0 for no sources", () => {
    expect(scoreConfidence([])).toBe(0);
  });

  test("returns higher score for more sources", () => {
    const few = [makeSource()];
    const many = Array.from({ length: 8 }, () => makeSource());

    const scoreFew = scoreConfidence(few);
    const scoreMany = scoreConfidence(many);

    expect(scoreMany).toBeGreaterThan(scoreFew);
  });

  test("boosts when sources have published dates", () => {
    const withDates = [makeSource({ published: "2 hours ago" }), makeSource({ published: "1 day ago" })];
    const withoutDates = [makeSource({ published: undefined }), makeSource({ published: undefined })];

    const scoreDated = scoreConfidence(withDates);
    const scoreUndated = scoreConfidence(withoutDates);

    expect(scoreDated).toBeGreaterThan(scoreUndated);
  });

  test("confidence is clamped between 0 and 1", () => {
    const sources = Array.from({ length: 20 }, () => makeSource());
    const score = scoreConfidence(sources);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  test("snippet quality affects confidence", () => {
    const goodSnippets = [
      makeSource({ snippet: "A very detailed and informative snippet about the topic that provides substantial context." }),
      makeSource({ snippet: "Another high quality snippet with lots of relevant information and data points." }),
    ];
    const badSnippets = [
      makeSource({ snippet: "x" }),
      makeSource({ snippet: "y" }),
    ];

    const scoreGood = scoreConfidence(goodSnippets);
    const scoreBad = scoreConfidence(badSnippets);

    expect(scoreGood).toBeGreaterThan(scoreBad);
  });

  test("source agreement boosts confidence", () => {
    const agreeing = [
      makeSource({ snippet: "The federal reserve held rates steady at four percent" }),
      makeSource({ snippet: "Federal reserve rates held steady according to officials" }),
    ];
    const disagreeing = [
      makeSource({ snippet: "Quantum computing makes breakthrough in laboratory settings" }),
      makeSource({ snippet: "Banana prices surge due to tropical storm disruption" }),
    ];

    const scoreAgree = scoreConfidence(agreeing);
    const scoreDisagree = scoreConfidence(disagreeing);

    expect(scoreAgree).toBeGreaterThan(scoreDisagree);
  });

  test("single source scores lower than multiple sources", () => {
    const one = [makeSource()];
    const three = [makeSource(), makeSource(), makeSource()];
    expect(scoreConfidence(three)).toBeGreaterThan(scoreConfidence(one));
  });
});
