# Admin search and customer navigation

Keep the existing Orders and Customers screens. An order drawer links directly
to its related customer ID, never a name/email guess; guest orders have no link.

Both lists use a labelled search input, submit and clear controls. Submit searches
the database before paging, so older records remain discoverable. Orders match
order number or customer/guest name, email and phone. Customers match name, email
and phone. Status filters and previous/next links preserve the search in the URL;
a new search or status resets the page. Browser back restores the previous query.

Keep the initial 50-order/80-customer page sizes, fetch one extra row to determine
whether another page exists, and use a stable ID tie-breaker. Avoid downloading
all customer records or querying the database on every keystroke. Page statistics
are explicitly labelled as page statistics. Database failures use the existing
admin error boundary rather than claiming no matches. Admin session checks apply
to both list loaders. Checkout, payments and database schema are unchanged.

Verify search beyond the initial limits, guest records, status combinations,
pagination, permissions, failures, navigation and responsive layouts.
