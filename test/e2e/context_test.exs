defmodule Playground.ContextTest do
  use Playground.FeatureCase

  feature "Context: syncs shared context", %{session: session} do
    session
    |> visit(~p"/context")
    |> assert_has(css(".ck-editor__editable", count: 2))
    |> type_in_editor("#container-first .ck-editor__editable", " in A")
    |> type_in_editor("#container-second .ck-editor__editable", " in B")
    |> assert_text(" in A")
    |> assert_text(" in B")
  end
end
