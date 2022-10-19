const {cancel} = require("./cancel.cjs");

const insertPayInsertHandler = async ({deep, syncTextFileTypeId, terminayKey, containTypeId, packageId, dockerSupportsJsId, handlerTypeId, handleInsertTypeId}) => {
    const payInsertHandler = `
async ({ deep, require, data: { newLink: payLink } }) => {
  ${handlersDependencies}

  const {data: mpDownPay, error: mpDownPaySelectQueryError} = await deep.select({
    down: {
      link_id: { _eq: payLink.id },
      tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree") },
    },
  });
  console.log({mpDownPay});
  if(mpDownPaySelectQueryError) { throw new Error(mpDownPaySelectQueryError.message); }

  const CancellingPayment = await deep.id("@deep-foundation/payments-tinkoff-c2b", "CancellingPayment");
  const cancellingPaymentLink = mpDownPay.find(link => link.type_id === CancellingPayment);
  console.log({cancellingPaymentLink});
  if(!cancellingPaymentLink) {
    return;
  }

  const TinkoffProvider = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
  const tinkoffProviderLinkSelectQuery = await deep.select({
    type_id: TinkoffProvider
  });
  if(tinkoffProviderLinkSelectQuery.error) {throw new Error(tinkoffProviderLinkSelectQuery.error.message);}
  const tinkoffProviderLink = tinkoffProviderLinkSelectQuery.data[0];

  const Sum = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Sum");
  const sumLink = mpDownPay.find(link => link.type_id === Sum); 
  console.log({sumLink});
  if(!sumLink) throw new Error("Sum link associated with the pay link " + payLink.id + " is not found.");

  const Url = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Url");

  const cancelledPaymentLinkSelectQuery = await deep.select({
    id: cancellingPaymentLink.from_id
  });
  if(cancelledPaymentLinkSelectQuery.error) { throw new Error(cancelledPaymentLinkSelectQuery.error.message); }
  const cancelledPaymentLink = cancelledPaymentLinkSelectQuery.data[0];
  console.log({cancelledPaymentLink}); 

  const Income = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Income");
  const incomeLinkInsertQuery = await deep.insert({
    type_id: Income,
    from_id: cancellingPaymentLink.id,
    to_id: cancelledPaymentLink.to_id
  });
  if(incomeLinkInsertQuery.error) {throw new Error(incomeLinkInsertQuery.error.message);}
  

  const userLinkSelectQuery = await deep.select({
    id: cancellingPaymentLink.to_id
  });
  if(userLinkSelectQuery.error) { throw new Error(userLinkSelectQuery.error.message); }
  const userLink = userLinkSelectQuery.data[0];
  console.log({userLink});
  
  const cancel = ${cancel.toString()};

  await deep.insert({link_id: cancellingPaymentLink.id, value: cancelledPaymentLink.value.value}, {table: "objects"});

  const cancelOptions = {
    TerminalKey: "${terminayKey}",
    PaymentId: cancelledPaymentLink.value.value.bankPaymentId,
    Amount: sumLink.value.value,
  };
  console.log({ cancelOptions });

  const cancelResult = await cancel(cancelOptions);
  console.log({cancelResult});
  if (cancelResult.error) {
    const errorMessage = "Could not cancel the order. " + JSON.stringify(cancelResult.error);

    const {error: errorLinkInsertQueryError} = await deep.insert({
      type_id: (await deep.id("@deep-foundation/payments-tinkoff-c2b", "Error")),
      from_id: tinkoffProviderLink.id,
      to_id: payLink.id,
      string: { data: { value: errorMessage } },
    });
    if(errorLinkInsertQueryError) { throw new Error(errorLinkInsertQueryError.message); }
    throw new Error(errorMessage);
  } 

  const {error: payedLinkInsertQueryError} = await deep.insert({
    type_id: await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payed"),
    from_id: tinkoffProviderLink.id,
    to_id: payLink.id,
  });
  if(payedLinkInsertQueryError) {throw new Error(payedLinkInsertQueryError.message); }
  
};
`;

const {
    data: [{ id: payInsertHandlerLinkId }],
  } = await deep.insert({
    type_id: syncTextFileTypeId,
    in: {
      data: [
        {
          type_id: containTypeId,
          from_id: packageId, // before created package
          string: { data: { value: 'payInsertHandlerFile' } },
        },
        {
          from_id: dockerSupportsJsId,
          type_id: handlerTypeId,
          in: {
            data: [
              {
                type_id: containTypeId,
                from_id: packageId, // before created package
                string: { data: { value: 'payInsertHandler' } },
              },
              {
                type_id: handleInsertTypeId,
                from_id: cancellingPayTypeId,
                in: {
                  data: [
                    {
                      type_id: containTypeId,
                      from_id: packageId, // before created package
                      string: { data: { value: 'payInsertHandle' } },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
    string: {
      data: {
        value: payInsertHandler,
      },
    },
  });

  return payInsertHandlerLinkId;
}

exports.insertPayInsertHandler = insertPayInsertHandler;