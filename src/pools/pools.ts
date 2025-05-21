import fetch from 'node-fetch';

export interface PoolDetails {
  poolAddress: string;
  name: string;
  tokenXMint: string;
  tokenYMint: string;
  binStep: number;
  baseFee: number;
  liquidity: number;
  volumeMin30: number;
  volumeHour1: number;
  feesMin30: number;
  feesHour1: number;
}

export async function fetchPoolsByCA(ca: string): Promise<void> {
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds
  const MAINNET_POOLS_API = 'https://dlmm-api.meteora.ag/pair/all';
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching pools from API (attempt ${attempt}/${maxRetries}):`, MAINNET_POOLS_API);
      console.log(''); // Add blank line after API fetch message
      const response = await fetch(MAINNET_POOLS_API);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      const allPools = await response.json();

      const matchingPools = allPools.filter((pool: any) => {
        const tokenXMint = pool.mint_x || '';
        const tokenYMint = pool.mint_y || '';
        const isMatch = tokenXMint === ca || tokenYMint === ca;
        if (!isMatch) {
          const poolString = JSON.stringify(pool).toLowerCase();
          return poolString.includes(ca.toLowerCase());
        }
        return isMatch;
      });

      if (matchingPools.length === 0) {
        console.log(`No pools found for token CA: ${ca}`);
        return;
      }

      const solPools: PoolDetails[] = [];
      const usdcPools: PoolDetails[] = [];

      matchingPools.forEach((pool: any) => {
        const tokenXMint = pool.mint_x || '';
        const tokenYMint = pool.mint_y || '';

        const poolDetails: PoolDetails = {
          poolAddress: pool.address,
          name: pool.name || 'N/A',
          tokenXMint,
          tokenYMint,
          binStep: pool.bin_step || 0,
          baseFee: pool.base_fee_percentage ? parseFloat(pool.base_fee_percentage) : 0,
          liquidity: pool.liquidity ? Math.floor(parseFloat(pool.liquidity)) : 0,
          volumeMin30: pool.volume?.min_30 ? Math.floor(parseFloat(pool.volume.min_30)) : 0,
          volumeHour1: pool.volume?.hour_1 ? Math.floor(parseFloat(pool.volume.hour_1)) : 0,
          feesMin30: pool.fees?.min_30 ? Math.floor(parseFloat(pool.fees.min_30)) : 0,
          feesHour1: pool.fees?.hour_1 ? Math.floor(parseFloat(pool.fees.hour_1)) : 0,
        };

        if (tokenXMint === SOL_MINT || tokenYMint === SOL_MINT) {
          solPools.push(poolDetails);
        } else if (tokenXMint === USDC_MINT || tokenYMint === USDC_MINT) {
          usdcPools.push(poolDetails);
        }
      });

      const sortPools = (pools: PoolDetails[]): PoolDetails[] => {
        return pools.sort((a: PoolDetails, b: PoolDetails) => {
          const apr30mA = a.liquidity > 0 ? (a.feesMin30 / a.liquidity) * 100 : 0;
          const apr30mB = b.liquidity > 0 ? (b.feesMin30 / b.liquidity) * 100 : 0;

          // Sort by APR 30m descending
          if (apr30mB !== apr30mA) {
            return apr30mB - apr30mA;
          }
          // If APR 30m is 0, sort by liquidity descending
          if (apr30mA === 0 && apr30mB === 0) {
            if (b.liquidity !== a.liquidity) {
              return b.liquidity - a.liquidity;
            }
            // If liquidity is also 0, sort by binStep descending
            return b.binStep - a.binStep;
          }
          return 0;
        });
      };

      const sortedSolPools = sortPools(solPools);
      const sortedUsdcPools = sortPools(usdcPools);

      if (sortedSolPools.length > 0) {
        const totalLiquidity = sortedSolPools.reduce((sum, pool) => sum + pool.liquidity, 0);
        const totalFees30m = sortedSolPools.reduce((sum, pool) => sum + pool.feesMin30, 0);
        const totalFees1h = sortedSolPools.reduce((sum, pool) => sum + pool.feesHour1, 0);
        const totalVolume30m = sortedSolPools.reduce((sum, pool) => sum + pool.volumeMin30, 0);
        const totalVolume1h = sortedSolPools.reduce((sum, pool) => sum + pool.volumeHour1, 0);
        const apr30m = totalLiquidity > 0 ? ((totalFees30m / totalLiquidity) * 100).toFixed(2) : '0.00';
        const apr1h = totalLiquidity > 0 ? ((totalFees1h / totalLiquidity) * 100).toFixed(2) : '0.00';
        // Dynamically determine the token name from the first pool's name
        const tokenName = sortedSolPools[0].name.split('-')[0];
        console.log(`${sortedSolPools.length} ${tokenName}-SOL pools | liq: ${totalLiquidity}$ | 30m => Fees: ${totalFees30m}$ / Vol: ${totalVolume30m}$ / APR: ${apr30m}% || 1h => Fees: ${totalFees1h}$ / Vol: ${totalVolume1h}$ / APR: ${apr1h}%`);
        printPoolInfo(sortedSolPools);
      }

      if (sortedUsdcPools.length > 0) {
        console.log(''); // Add blank line between SOL and USDC pools
        const totalLiquidity = sortedUsdcPools.reduce((sum, pool) => sum + pool.liquidity, 0);
        const totalFees30m = sortedUsdcPools.reduce((sum, pool) => sum + pool.feesMin30, 0);
        const totalFees1h = sortedUsdcPools.reduce((sum, pool) => sum + pool.feesHour1, 0);
        const totalVolume30m = sortedUsdcPools.reduce((sum, pool) => sum + pool.volumeMin30, 0);
        const totalVolume1h = sortedUsdcPools.reduce((sum, pool) => sum + pool.volumeHour1, 0);
        const apr30m = totalLiquidity > 0 ? ((totalFees30m / totalLiquidity) * 100).toFixed(2) : '0.00';
        const apr1h = totalLiquidity > 0 ? ((totalFees1h / totalLiquidity) * 100).toFixed(2) : '0.00';
        // Dynamically determine the token name from the first pool's name
        const tokenName = sortedUsdcPools[0].name.split('-')[0];
        console.log(`${sortedUsdcPools.length} ${tokenName}-USDC pools | liq: ${totalLiquidity}$ | 30m => Fees: ${totalFees30m}$ / Vol: ${totalVolume30m}$ / APR: ${apr30m}% || 1h => Fees: ${totalFees1h}$ / Vol: ${totalVolume1h}$ / APR: ${apr1h}%`);
        printPoolInfo(sortedUsdcPools);
        console.log(''); // Add two blank lines at the end
        console.log('');
      }

      return;
    } catch (error: any) {
      console.error(`Error in fetchPoolsByCA (attempt ${attempt}/${maxRetries}):`, error.message || error.toString());
      if (error.message.includes('API error') && error.message.includes('429') && attempt < maxRetries) {
        console.log(`Rate limit hit, retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      if (error.message.includes('API error')) {
        console.error('Failed to fetch pools due to API error:', error.message);
      } else if (error.message.includes('network')) {
        console.error('Network error while fetching pools:', error.message);
      } else {
        console.error('Failed to fetch pools from API:', error.message || error.toString());
      }
      return;
    }
  }
  console.error('Max retries reached, could not fetch pools.');
}

export function printPoolInfo(pools: PoolDetails[]): void {
  if (!pools.length) {
    return;
  }

  // Define column headers
  const headers = ['BinStep', 'BFee %', 'Liq', 'Fees 30m', 'APR 30m', 'Fees 1h', 'APR 1h', 'Pool address'];

  // Calculate column widths based on the longest value in each column
  const colWidths = headers.map((header, i) => {
    const values = pools.map(pool => {
      const apr30m = pool.liquidity > 0 ? ((pool.feesMin30 / pool.liquidity) * 100).toFixed(2) : '0.00';
      const apr1h = pool.liquidity > 0 ? ((pool.feesHour1 / pool.liquidity) * 100).toFixed(2) : '0.00';
      const rowValues = [
        pool.binStep.toString(),
        pool.baseFee.toFixed(2),
        pool.liquidity.toString(),
        pool.feesMin30.toString(),
        apr30m,
        pool.feesHour1.toString(),
        apr1h,
        pool.poolAddress
      ];
      return rowValues[i].length;
    });
    return Math.max(header.length, ...values);
  });

  // Adjust border widths to account for double separators (|| takes 2 characters)
  const separatorWidths = colWidths.map((w, i) => {
    if (i === 2 || i === 4) {
      // Add 1 to account for the extra character in || (2 characters instead of 1 for |)
      return w + 1;
    }
    return w;
  });

  // Print the header row with double vertical lines before Fees 30m (index 3) and Fees 1h (index 5)
  const headerRowParts = headers.map((header, i) => header.padEnd(colWidths[i]));
  const headerRow = `${headerRowParts.slice(0, 3).join(' | ')} || ${headerRowParts.slice(3, 5).join(' | ')} || ${headerRowParts.slice(5).join(' | ')}`;
  console.log(`+${separatorWidths.map(w => '-'.repeat(w)).join('-+-')}+`);
  console.log(`| ${headerRow} |`);
  console.log(`+${separatorWidths.map(w => '-'.repeat(w)).join('-+-')}+`);

  // Print each row with double vertical lines before Fees 30m (index 3) and Fees 1h (index 5)
  pools.forEach(pool => {
    const apr30m = pool.liquidity > 0 ? ((pool.feesMin30 / pool.liquidity) * 100).toFixed(2) : '0.00';
    const apr1h = pool.liquidity > 0 ? ((pool.feesHour1 / pool.liquidity) * 100).toFixed(2) : '0.00';
    const rowParts = [
      pool.binStep.toString().padEnd(colWidths[0]),
      pool.baseFee.toFixed(2).padEnd(colWidths[1]),
      pool.liquidity.toString().padEnd(colWidths[2]),
      pool.feesMin30.toString().padEnd(colWidths[3]),
      apr30m.padEnd(colWidths[4]),
      pool.feesHour1.toString().padEnd(colWidths[5]),
      apr1h.padEnd(colWidths[6]),
      pool.poolAddress.padEnd(colWidths[7])
    ];
    const row = `${rowParts.slice(0, 3).join(' | ')} || ${rowParts.slice(3, 5).join(' | ')} || ${rowParts.slice(5).join(' | ')}`;
    console.log(`| ${row} |`);
  });

  // Print the bottom border
  console.log(`+${separatorWidths.map(w => '-'.repeat(w)).join('-+-')}+`);
}