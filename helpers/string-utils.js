const levenshteinDistance = (s1, s2) => {
    if (s1.length < s2.length) {
        var temp = s1;
        s1 = s2;
        s2 = temp;
    }

    var len1 = s1.length;
    var len2 = s2.length;

    if (len2 === 0) {
        return len1;
    }

    var prevRow = [];
    var currentRow = [];
    var i, j;

    for (i = 0; i <= len2; i++) {
        prevRow[i] = i;
    }

    for (i = 1; i <= len1; i++) {
        currentRow[0] = i;
        for (j = 1; j <= len2; j++) {
            var cost = (s1[i - 1] === s2[j - 1]) ? 0 : 1;
            currentRow[j] = Math.min(
                currentRow[j - 1] + 1, 
                prevRow[j] + 1, 
                prevRow[j - 1] + cost
            );
        }
        var tempRow = prevRow;
        prevRow = currentRow;
        currentRow = tempRow;
    }

    return prevRow[len2];
};

const longestCommonSubstring = (s1, s2) => {
    var m = s1.length;
    var n = s2.length;
    var max = 0;
    var dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (var i = 1; i <= m; i++) {
        for (var j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                max = Math.max(max, dp[i][j]);
            }
        }
    }

    return max;
};

module.exports = {
    levenshteinDistance,
    longestCommonSubstring
};