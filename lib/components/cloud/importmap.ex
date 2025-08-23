defmodule CKEditor5.Components.Cloud.Importmap do
  @moduledoc """
  A component for rendering import map script tags of CKEditor 5 in Phoenix.

  ## ⚠️ Warning

  Import maps can only be used if the preset has the Cloud option enabled, which is not available
  under the GPL license key. You must specify your own Cloud or use a commercial license to utilize
  this feature.
  """

  use Phoenix.Component

  import Phoenix.HTML
  import CKEditor5.Components.Cloud.Assigns

  alias CKEditor5.Cloud
  alias CKEditor5.Cloud.AssetPackageBuilder

  @doc """
  Renders the import map script tag.
  """
  attr :nonce, :string, default: nil, doc: "The CSP nonce to use for the script tag."

  attr :extra_imports, :map,
    default: %{},
    doc: "Additional imports to include in the import map."

  cloud_build_attrs()

  def render(assigns) do
    imports =
      importmap_json!(assigns)
      |> Map.merge(assigns.extra_imports)
      |> then(&%{imports: &1})
      |> Jason.encode!()

    assigns = assigns |> Map.put(:imports, imports)

    ~H"""
    <script type="importmap" nonce={@nonce}><%= raw(@imports) %></script>
    """
  end

  @doc """
  Generates the import map JSON for a given Cloud struct. It can be used when you use the custom
  `importmap` renderer in your application.
  """
  def importmap_json!(%Cloud{} = cloud) do
    AssetPackageBuilder.build(cloud)
    |> Map.get(:js)
    |> Enum.filter(&(&1.type == :esm))
    |> Enum.map(&{&1.name, &1.url})
    |> Enum.into(%{})
  end

  def importmap_json!(assigns) when is_map(assigns) do
    assigns
    |> build_cloud!()
    |> importmap_json!()
  end
end
