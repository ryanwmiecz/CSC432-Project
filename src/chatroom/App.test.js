/**
 * Test Suite for Motion-Related Functions
 * Tests vote calculations, tie scenarios, and edge cases
 */

// Simple test framework
let passedTests = 0;
let failedTests = 0;
const failedTestDetails = [];

function test(description, fn) {
  try {
    fn();
    passedTests++;
    console.log(`✓ ${description}`);
  } catch (error) {
    failedTests++;
    console.log(`✗ ${description}`);
    failedTestDetails.push({ description, error: error.message });
  }
}

function describe(suiteName, fn) {
  console.log(`\n${suiteName}`);
  fn();
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}`);
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`);
      }
    }
  };
}

// Mock motion data helper
const createMockMotion = (votes = {}, type = 'normal', status = 1) => ({
  id: 'test-motion-1',
  title: 'Test Motion',
  desc: 'Test Description',
  votes,
  type,
  status,
  proposedBy: 'user1',
  proposedByName: 'Test User',
  replies: [],
  history: []
});

// Vote calculation logic (extracted from App.jsx)
const calculateVoteResults = (motion) => {
  const yesVotes = Object.values(motion.votes || {}).filter((v) => v === "yes").length;
  const noVotes = Object.values(motion.votes || {}).filter((v) => v === "no").length;
  const abstainVotes = Object.values(motion.votes || {}).filter((v) => v === "abstain").length;
  const totalVotes = yesVotes + noVotes; // Abstentions don't count toward total
  
  // For majority: need MORE than half (not equal to half)
  // For 2/3: need at least 2/3 of votes cast
  const requiredVotes = motion.type === "procedure" 
    ? Math.ceil(totalVotes * 2 / 3) 
    : Math.floor(totalVotes / 2) + 1;
  
  const hasPassedVotes = yesVotes >= requiredVotes;
  const hasFailedVotes = totalVotes > 0 && noVotes >= requiredVotes;
  
  return {
    yesVotes,
    noVotes,
    abstainVotes,
    totalVotes,
    requiredVotes,
    hasPassedVotes,
    hasFailedVotes
  };
};

// Validation logic (extracted from App.jsx)
const canRecordAsPassedOrFailed = (motion, result) => {
  const { yesVotes, requiredVotes, hasPassedVotes } = calculateVoteResults(motion);
  
  if (result === 'passed' && yesVotes < requiredVotes) {
    return {
      valid: false,
      reason: `Cannot record as passed: only ${yesVotes} yes votes, but ${requiredVotes} required`
    };
  }
  
  if (result === 'failed' && hasPassedVotes) {
    return {
      valid: false,
      reason: `Cannot record as failed: motion has ${yesVotes} yes votes, which meets the ${requiredVotes} required`
    };
  }
  
  return { valid: true };
};

describe('Vote Calculation Tests', () => {
  
  describe('Normal Motion (Simple Majority)', () => {
    
    test('Should require 2 votes to pass with 3 total votes', () => {
      const motion = createMockMotion({ user1: 'yes', user2: 'no', user3: 'no' });
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(3);
      expect(result.requiredVotes).toBe(2);
      expect(result.yesVotes).toBe(1);
      expect(result.hasPassedVotes).toBe(false);
    });
    
    test('Should pass with 2 yes votes out of 3', () => {
      const motion = createMockMotion({ user1: 'yes', user2: 'yes', user3: 'no' });
      const result = calculateVoteResults(motion);
      expect(result.yesVotes).toBe(2);
      expect(result.requiredVotes).toBe(2);
      expect(result.hasPassedVotes).toBe(true);
    });
    
    test('TIE: 2-2 should FAIL (requires 3 to pass)', () => {
      const motion = createMockMotion({ 
        user1: 'yes', 
        user2: 'yes', 
        user3: 'no', 
        user4: 'no' 
      });
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(4);
      expect(result.requiredVotes).toBe(3); // floor(4/2) + 1 = 3
      expect(result.yesVotes).toBe(2);
      expect(result.hasPassedVotes).toBe(false);
      expect(result.hasFailedVotes).toBe(false);
    });
    
    test('Should require 3 votes to pass with 4 total votes', () => {
      const motion = createMockMotion({ 
        user1: 'yes', 
        user2: 'yes', 
        user3: 'no', 
        user4: 'no' 
      });
      const result = calculateVoteResults(motion);
      expect(result.requiredVotes).toBe(3);
      expect(result.hasPassedVotes).toBe(false);
    });
    
    test('Should pass with 3 yes votes out of 4', () => {
      const motion = createMockMotion({ 
        user1: 'yes', 
        user2: 'yes', 
        user3: 'yes', 
        user4: 'no' 
      });
      const result = calculateVoteResults(motion);
      expect(result.yesVotes).toBe(3);
      expect(result.requiredVotes).toBe(3);
      expect(result.hasPassedVotes).toBe(true);
    });
    
    test('Should require 6 votes to pass with 10 total votes', () => {
      const motion = createMockMotion({ 
        user1: 'yes', user2: 'yes', user3: 'yes', user4: 'yes', user5: 'yes',
        user6: 'no', user7: 'no', user8: 'no', user9: 'no', user10: 'no'
      });
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(10);
      expect(result.requiredVotes).toBe(6);
      expect(result.yesVotes).toBe(5);
      expect(result.hasPassedVotes).toBe(false);
    });
    
    test('Should pass with 6 yes votes out of 10', () => {
      const motion = createMockMotion({ 
        user1: 'yes', user2: 'yes', user3: 'yes', user4: 'yes', user5: 'yes', user6: 'yes',
        user7: 'no', user8: 'no', user9: 'no', user10: 'no'
      });
      const result = calculateVoteResults(motion);
      expect(result.yesVotes).toBe(6);
      expect(result.requiredVotes).toBe(6);
      expect(result.hasPassedVotes).toBe(true);
    });
    
    test('TIE: 5-5 should FAIL (requires 6 to pass)', () => {
      const motion = createMockMotion({ 
        user1: 'yes', user2: 'yes', user3: 'yes', user4: 'yes', user5: 'yes',
        user6: 'no', user7: 'no', user8: 'no', user9: 'no', user10: 'no'
      });
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(10);
      expect(result.requiredVotes).toBe(6);
      expect(result.yesVotes).toBe(5);
      expect(result.hasPassedVotes).toBe(false);
    });
    
    test('Single vote should pass (1 yes, 0 no)', () => {
      const motion = createMockMotion({ user1: 'yes' });
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(1);
      expect(result.requiredVotes).toBe(1); // floor(1/2) + 1 = 1
      expect(result.hasPassedVotes).toBe(true);
    });
    
    test('Unanimous vote should pass', () => {
      const motion = createMockMotion({ 
        user1: 'yes', user2: 'yes', user3: 'yes' 
      });
      const result = calculateVoteResults(motion);
      expect(result.yesVotes).toBe(3);
      expect(result.noVotes).toBe(0);
      expect(result.hasPassedVotes).toBe(true);
    });
  });
  
  describe('Procedure Motion (2/3 Majority)', () => {
    
    test('Should require 2 votes to pass with 3 total votes (2/3)', () => {
      const motion = createMockMotion({ 
        user1: 'yes', user2: 'no', user3: 'no' 
      }, 'procedure');
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(3);
      expect(result.requiredVotes).toBe(2); // ceil(3 * 2/3) = 2
      expect(result.yesVotes).toBe(1);
      expect(result.hasPassedVotes).toBe(false);
    });
    
    test('Should pass with 2 yes votes out of 3 (exactly 2/3)', () => {
      const motion = createMockMotion({ 
        user1: 'yes', user2: 'yes', user3: 'no' 
      }, 'procedure');
      const result = calculateVoteResults(motion);
      expect(result.yesVotes).toBe(2);
      expect(result.requiredVotes).toBe(2);
      expect(result.hasPassedVotes).toBe(true);
    });
    
    test('Should require 7 votes to pass with 10 total votes (2/3)', () => {
      const motion = createMockMotion({ 
        user1: 'yes', user2: 'yes', user3: 'yes', user4: 'yes', user5: 'yes', user6: 'yes',
        user7: 'no', user8: 'no', user9: 'no', user10: 'no'
      }, 'procedure');
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(10);
      expect(result.requiredVotes).toBe(7); // ceil(10 * 2/3) = 7
      expect(result.yesVotes).toBe(6);
      expect(result.hasPassedVotes).toBe(false);
    });
    
    test('Should pass with 7 yes votes out of 10 (2/3)', () => {
      const motion = createMockMotion({ 
        user1: 'yes', user2: 'yes', user3: 'yes', user4: 'yes', user5: 'yes', 
        user6: 'yes', user7: 'yes',
        user8: 'no', user9: 'no', user10: 'no'
      }, 'procedure');
      const result = calculateVoteResults(motion);
      expect(result.yesVotes).toBe(7);
      expect(result.requiredVotes).toBe(7);
      expect(result.hasPassedVotes).toBe(true);
    });
    
    test('Should require 6 votes to pass with 9 total votes (2/3)', () => {
      const motion = createMockMotion({ 
        user1: 'yes', user2: 'yes', user3: 'yes', user4: 'yes', user5: 'yes',
        user6: 'no', user7: 'no', user8: 'no', user9: 'no'
      }, 'procedure');
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(9);
      expect(result.requiredVotes).toBe(6); // ceil(9 * 2/3) = 6
      expect(result.yesVotes).toBe(5);
      expect(result.hasPassedVotes).toBe(false);
    });
    
    test('Single yes vote should pass (2/3 of 1 is 1)', () => {
      const motion = createMockMotion({ user1: 'yes' }, 'procedure');
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(1);
      expect(result.requiredVotes).toBe(1); // ceil(1 * 2/3) = 1
      expect(result.hasPassedVotes).toBe(true);
    });
    
    test('2/3 requirement: 4 votes requires 3 to pass', () => {
      const motion = createMockMotion({ 
        user1: 'yes', user2: 'yes', user3: 'no', user4: 'no' 
      }, 'procedure');
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(4);
      expect(result.requiredVotes).toBe(3); // ceil(4 * 2/3) = 3
      expect(result.yesVotes).toBe(2);
      expect(result.hasPassedVotes).toBe(false);
    });
  });
  
  describe('Abstention Handling', () => {
    
    test('Abstentions should not count toward total votes', () => {
      const motion = createMockMotion({ 
        user1: 'yes', 
        user2: 'no', 
        user3: 'abstain', 
        user4: 'abstain' 
      });
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(2); // Only yes + no
      expect(result.abstainVotes).toBe(2);
      expect(result.requiredVotes).toBe(2); // floor(2/2) + 1 = 2
      expect(result.hasPassedVotes).toBe(false);
    });
    
    test('All abstentions should result in no votes', () => {
      const motion = createMockMotion({ 
        user1: 'abstain', 
        user2: 'abstain', 
        user3: 'abstain' 
      });
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(0);
      expect(result.abstainVotes).toBe(3);
      expect(result.yesVotes).toBe(0);
      expect(result.noVotes).toBe(0);
    });
    
    test('Abstentions with yes/no should calculate correctly', () => {
      const motion = createMockMotion({ 
        user1: 'yes', user2: 'yes', user3: 'yes',
        user4: 'no',
        user5: 'abstain', user6: 'abstain'
      });
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(4); // 3 yes + 1 no
      expect(result.abstainVotes).toBe(2);
      expect(result.requiredVotes).toBe(3);
      expect(result.hasPassedVotes).toBe(true);
    });
  });
  
  describe('Edge Cases', () => {
    
    test('No votes should have 0 total and not pass', () => {
      const motion = createMockMotion({});
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(0);
      expect(result.yesVotes).toBe(0);
      expect(result.noVotes).toBe(0);
      expect(result.hasPassedVotes).toBe(false);
      expect(result.hasFailedVotes).toBe(false);
    });
    
    test('Null votes object should handle gracefully', () => {
      const motion = createMockMotion(null);
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(0);
      expect(result.yesVotes).toBe(0);
      expect(result.hasPassedVotes).toBe(false);
    });
    
    test('Undefined votes should handle gracefully', () => {
      const motion = { ...createMockMotion() };
      delete motion.votes;
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(0);
      expect(result.yesVotes).toBe(0);
    });
    
    test('Invalid vote values should be ignored', () => {
      const motion = createMockMotion({ 
        user1: 'yes', 
        user2: 'no', 
        user3: 'maybe', 
        user4: null, 
        user5: undefined 
      });
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(2); // Only yes and no count
      expect(result.yesVotes).toBe(1);
      expect(result.noVotes).toBe(1);
    });
    
    test('Very large number of votes should calculate correctly', () => {
      const votes = {};
      for (let i = 1; i <= 50; i++) {
        votes[`user${i}`] = 'yes';
      }
      for (let i = 51; i <= 100; i++) {
        votes[`user${i}`] = 'no';
      }
      const motion = createMockMotion(votes);
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(100);
      expect(result.requiredVotes).toBe(51); // floor(100/2) + 1
      expect(result.yesVotes).toBe(50);
      expect(result.hasPassedVotes).toBe(false);
    });
    
    test('Exact tie with odd total votes should fail', () => {
      const motion = createMockMotion({ 
        user1: 'yes', user2: 'yes',
        user3: 'no', user4: 'no',
        user5: 'abstain' // Makes it effectively 2-2
      });
      const result = calculateVoteResults(motion);
      expect(result.totalVotes).toBe(4);
      expect(result.requiredVotes).toBe(3);
      expect(result.yesVotes).toBe(2);
      expect(result.hasPassedVotes).toBe(false);
    });
  });
});

describe('Recording Validation Tests', () => {
  
  test('Should allow recording as passed when votes meet requirement', () => {
    const motion = createMockMotion({ 
      user1: 'yes', user2: 'yes', user3: 'yes', 
      user4: 'no' 
    });
    const validation = canRecordAsPassedOrFailed(motion, 'passed');
    expect(validation.valid).toBe(true);
  });
  
  test('Should block recording as passed when votes insufficient', () => {
    const motion = createMockMotion({ 
      user1: 'yes', user2: 'yes', 
      user3: 'no', user4: 'no' 
    });
    const validation = canRecordAsPassedOrFailed(motion, 'passed');
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('only 2 yes votes');
    expect(validation.reason).toContain('3 required');
  });
  
  test('Should allow recording as failed when votes insufficient to pass', () => {
    const motion = createMockMotion({ 
      user1: 'yes', user2: 'no', user3: 'no' 
    });
    const validation = canRecordAsPassedOrFailed(motion, 'failed');
    expect(validation.valid).toBe(true);
  });
  
  test('Should block recording as failed when motion actually passes', () => {
    const motion = createMockMotion({ 
      user1: 'yes', user2: 'yes', user3: 'yes', 
      user4: 'no' 
    });
    const validation = canRecordAsPassedOrFailed(motion, 'failed');
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('Cannot record as failed');
  });
  
  test('Should handle tie correctly - block passed, allow failed', () => {
    const motion = createMockMotion({ 
      user1: 'yes', user2: 'yes', 
      user3: 'no', user4: 'no' 
    });
    const passValidation = canRecordAsPassedOrFailed(motion, 'passed');
    const failValidation = canRecordAsPassedOrFailed(motion, 'failed');
    expect(passValidation.valid).toBe(false);
    expect(failValidation.valid).toBe(true);
  });
  
  test('2/3 vote: Should block recording as passed with insufficient votes', () => {
    const motion = createMockMotion({ 
      user1: 'yes', user2: 'yes', user3: 'yes', user4: 'yes', user5: 'yes', user6: 'yes',
      user7: 'no', user8: 'no', user9: 'no', user10: 'no'
    }, 'procedure');
    const validation = canRecordAsPassedOrFailed(motion, 'passed');
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('6 yes votes');
    expect(validation.reason).toContain('7 required');
  });
  
  test('2/3 vote: Should allow recording as passed with sufficient votes', () => {
    const motion = createMockMotion({ 
      user1: 'yes', user2: 'yes', user3: 'yes', user4: 'yes', 
      user5: 'yes', user6: 'yes', user7: 'yes',
      user8: 'no', user9: 'no', user10: 'no'
    }, 'procedure');
    const validation = canRecordAsPassedOrFailed(motion, 'passed');
    expect(validation.valid).toBe(true);
  });
});

describe('Special Motion Behavior', () => {
  
  test('Special motions should calculate votes same as normal motions', () => {
    const specialMotion = createMockMotion({ 
      user1: 'yes', user2: 'yes', user3: 'no', user4: 'no' 
    }, 'special');
    const normalMotion = createMockMotion({ 
      user1: 'yes', user2: 'yes', user3: 'no', user4: 'no' 
    }, 'normal');
    
    const specialResult = calculateVoteResults(specialMotion);
    const normalResult = calculateVoteResults(normalMotion);
    
    expect(specialResult.requiredVotes).toBe(normalResult.requiredVotes);
    expect(specialResult.hasPassedVotes).toBe(normalResult.hasPassedVotes);
  });
  
  test('Special motions should use majority vote (not 2/3)', () => {
    const motion = createMockMotion({ 
      user1: 'yes', user2: 'yes', user3: 'yes',
      user4: 'no', user5: 'no', user6: 'no', user7: 'no'
    }, 'special');
    const result = calculateVoteResults(motion);
    expect(result.requiredVotes).toBe(4); // Majority, not 2/3
    expect(result.hasPassedVotes).toBe(false);
  });
});

describe('Quorum Requirements (Integration)', () => {
  
  test('50% quorum calculation', () => {
    const totalMembers = 10;
    const onlineMembers = 5;
    const quorumMet = onlineMembers >= Math.ceil(totalMembers / 2);
    expect(quorumMet).toBe(true); // Exactly 50%
  });
  
  test('Quorum not met with less than 50%', () => {
    const totalMembers = 10;
    const onlineMembers = 4;
    const quorumMet = onlineMembers >= Math.ceil(totalMembers / 2);
    expect(quorumMet).toBe(false);
  });
  
  test('Quorum met with more than 50%', () => {
    const totalMembers = 10;
    const onlineMembers = 6;
    const quorumMet = onlineMembers >= Math.ceil(totalMembers / 2);
    expect(quorumMet).toBe(true);
  });
  
  test('Quorum with odd number of members', () => {
    const totalMembers = 9;
    const onlineMembers = 5;
    const quorumMet = onlineMembers >= Math.ceil(totalMembers / 2);
    expect(quorumMet).toBe(true); // Need 5 out of 9
  });
  
  test('Quorum just below threshold with odd members', () => {
    const totalMembers = 9;
    const onlineMembers = 4;
    const quorumMet = onlineMembers >= Math.ceil(totalMembers / 2);
    expect(quorumMet).toBe(false); // Need 5, have 4
  });
});

// Print summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Summary`);
console.log('='.repeat(50));
console.log(`✓ Passed: ${passedTests}`);
console.log(`✗ Failed: ${failedTests}`);
console.log(`Total: ${passedTests + failedTests}`);

if (failedTests > 0) {
  console.log('\n❌ Failed Test Details:');
  failedTestDetails.forEach(({ description, error }) => {
    console.log(`  - ${description}`);
    console.log(`    ${error}`);
  });
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
}
