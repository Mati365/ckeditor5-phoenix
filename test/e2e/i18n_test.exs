defmodule Playground.I18nTest do
  use Playground.FeatureCase

  feature "I18n: renders editor in German", %{session: session} do
    session
    |> visit(~p"/i18n")
    |> assert_has(Query.css(".ck-editor__editable[lang='de']"))
    |> assert_has(Query.css(".ck-button__label", text: "Absatz"))
  end
end
