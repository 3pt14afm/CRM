// resources/js/utils/sprf/normalizers2.js (new file)
import { makeGroupRow } from './factories';
import { makeSubitemRow } from './factories';
import { makeRowKey } from './factories';
import { isBlank } from './calculations';

// v2 variant of flattenItemsFromApi: rehydrates sellingPricePerUnit instead
// of markupPercent (markup is derived on the frontend via computeGroup2).
export const flattenItemsFromApi2 = (apiItems = []) => {
  if (!Array.isArray(apiItems) || apiItems.length === 0) {
    return [makeGroupRow()];
  }

  return apiItems.map((group) =>
    makeGroupRow({
      rowKey: group.rowKey || makeRowKey('group'),
      subitems:
        (group.subitems || []).length > 0
          ? group.subitems.map((sub) =>
              makeSubitemRow({
                rowKey: sub.rowKey || makeRowKey('sub'),
                productCode: sub.productCode ?? '',
                itemDescription: sub.itemDescription ?? '',
                qty: sub.qty ?? '',
                disty: sub.disty ?? '',
                costPerUnit: isBlank(sub.costPerUnit) ? '' : Number(sub.costPerUnit),
                sellingPricePerUnit: isBlank(sub.sellingPricePerUnit) ? '' : Number(sub.sellingPricePerUnit),
              })
            )
          : [makeSubitemRow({ sellingPricePerUnit: '' })],
    })
  );
};