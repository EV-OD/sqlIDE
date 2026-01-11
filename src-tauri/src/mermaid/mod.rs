use crate::types::{MermaidConfig, Schema};

fn sanitize_id(name: &str) -> String {
    name.chars()
        .filter(|c| c.is_alphanumeric() || *c == '_')
        .collect()
}

fn sanitize_name(name: &str) -> String {
    if name.chars().any(|c| !c.is_alphanumeric() && c != '_') {
        format!("\"{}\"", name)
    } else {
        name.to_string()
    }
}

fn sanitize_type(type_str: &str) -> String {
    type_str.replace(' ', "_")
}

fn get_theme_colors(theme: &str) -> (&'static str, &'static str, &'static str) {
    match theme {
        "dark" => (
            "fill:#1f2937,stroke:#60a5fa,stroke-width:2px,color:#fff",
            "fill:#374151,stroke:#fb923c,stroke-width:1px,color:#fff",
            "fill:#374151,stroke:#c084fc,stroke-width:2px,color:#fff",
        ),
        "forest" => (
            "fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px",
            "fill:#fff3e0,stroke:#ef6c00,stroke-width:1px",
            "fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px",
        ),
        "neutral" => (
            "fill:#f3f4f6,stroke:#4b5563,stroke-width:2px",
            "fill:#ffffff,stroke:#9ca3af,stroke-width:1px",
            "fill:#f9fafb,stroke:#6b7280,stroke-width:2px",
        ),
        _ => (
            "fill:#e3f2fd,stroke:#1565c0,stroke-width:2px",
            "fill:#fff3e0,stroke:#ef6c00,stroke-width:1px",
            "fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px",
        ),
    }
}

pub fn generate_crows_foot(schema: &Schema) -> String {
    let mut code = String::from("erDiagram\n");

    // Generate Entities
    for table in &schema.tables {
        code.push_str(&format!("    {} {{\n", sanitize_name(&table.name)));
        for col in &table.columns {
            let mut keys = Vec::new();
            if col.is_primary_key {
                keys.push("PK");
            }
            if col.is_foreign_key {
                keys.push("FK");
            }
            let key_string = if keys.is_empty() {
                String::new()
            } else {
                format!(" {}", keys.join(","))
            };
            code.push_str(&format!(
                "        {} {}{}\n",
                sanitize_type(&col.column_type),
                sanitize_name(&col.name),
                key_string
            ));
        }
        code.push_str("    }\n");
    }

    // Generate Relationships
    for table in &schema.tables {
        for col in &table.columns {
            if col.is_foreign_key {
                if let Some(ref target_table) = col.foreign_key_target_table {
                    let source = sanitize_name(&table.name);
                    let target = sanitize_name(target_table);
                    code.push_str(&format!(
                        "    {} }}o--|| {} : \"{}\"\n",
                        source, target, col.name
                    ));
                }
            }
        }
    }

    code
}

pub fn generate_chen(schema: &Schema, theme: &str, randomize: bool) -> String {
    let mut code = String::from("flowchart TD\n");

    let (entity_color, attribute_color, relationship_color) = get_theme_colors(theme);

    code.push_str(&format!("    classDef entity {};\n", entity_color));
    code.push_str(&format!("    classDef attribute {};\n", attribute_color));
    // Using 6 3 for a clearer dashed pattern that handles curves better than equal spacing
    code.push_str(&format!("    classDef derivedAttribute {},stroke-dasharray: 6 3;\n", attribute_color));
    code.push_str(&format!("    classDef multivaluedAttribute {},stroke-width: 3.5px;\n", attribute_color));
    code.push_str(&format!("    classDef relationship {};\n", relationship_color));

    for table in &schema.tables {
        let entity_id = format!("E_{}", sanitize_id(&table.name));
        code.push_str(&format!(
            "    {}[\"{}\"]:::entity\n",
            entity_id, table.name
        ));

        for col in &table.columns {
            let attr_id = format!("A_{}_{}", sanitize_id(&table.name), sanitize_id(&col.name));
            let label = if col.is_primary_key {
                format!("<u>{}</u>", col.name)
            } else {
                col.name.clone()
            };

            let class_name = if col.is_derived {
                "derivedAttribute"
            } else if col.is_multivalued {
                "multivaluedAttribute"
            } else {
                "attribute"
            };

            code.push_str(&format!("    {}([\"{}\"]):::{}\n", attr_id, label, class_name));
            // Add interaction only if security is loose.
            // We'll trust the frontend config to matching the click availability.
            code.push_str(&format!("    click {} callback \"Edit Attribute\"\n", attr_id));
            
            // Distribute attributes around the entity by alternating direction if randomize is true
            let hash = col.name.len() + table.name.len(); 
            if randomize && hash % 4 == 0 {
                 // Top
                 code.push_str(&format!("    {} --- {}\n", attr_id, entity_id));
            } else if randomize && hash % 4 == 1 {
                 // Bottom
                 code.push_str(&format!("    {} --- {}\n", entity_id, attr_id));
            } else if randomize && hash % 4 == 2 {
                 // Left
                 code.push_str(&format!("    {} --- {}\n", attr_id, entity_id));
            } else if randomize && hash % 4 == 3 {
                 // Right
                 code.push_str(&format!("    {} --- {}\n", entity_id, attr_id));
            } else {
                 // Default direction (Bottom)
                 code.push_str(&format!("    {} --- {}\n", entity_id, attr_id));
            }
        }
    }

    // Relationships - Always Standard Direction logic (Source ---|N| Rel ---|1| Target)
    // We do NOT randomize this part.
    // let mut rel_counter = 0; // Removing counter in favor of deterministic IDs
    for table in &schema.tables {
        for col in &table.columns {
            if col.is_foreign_key {
                if let Some(ref target_table) = col.foreign_key_target_table {
                    let source_id = format!("E_{}", sanitize_id(&table.name));
                    let target_id = format!("E_{}", sanitize_id(target_table));
                    // Deterministic ID: R_{SourceTable}_{ColumnName}
                    let rel_id = format!("R_{}_{}", sanitize_id(&table.name), sanitize_id(&col.name));
                    
                    let source_card = col.cardinality_source.as_deref().unwrap_or("N");
                    let target_card = col.cardinality_target.as_deref().unwrap_or("1");

                    code.push_str(&format!(
                        "    {}{{\"{}\"}}:::relationship\n",
                        rel_id, col.name
                    ));
                    // Add click callback for the relationship
                    code.push_str(&format!("    click {} callback \"Edit Relationship\"\n", rel_id));

                    code.push_str(&format!("    {} ---|{}| {}\n", source_id, source_card, rel_id));
                    code.push_str(&format!("    {} ---|{}| {}\n", rel_id, target_card, target_id));
                }
            }
        }
    }

    code
}

pub fn generate_mermaid_code(schema: &Schema, style: &str, config: &MermaidConfig) -> String {
    let theme = config.theme.as_deref().unwrap_or("default");
    let curve = config.curve.as_deref().unwrap_or("basis");
    let randomize = config.randomize.unwrap_or(false);

    let init_directive = if style == "chen" {
        format!(
            "%%{{init: {{'theme': '{}', 'flowchart': {{'curve': '{}'}}}}}}%%\n",
            theme, curve
        )
    } else {
        format!("%%{{init: {{'theme': '{}'}}}}%%\n", theme)
    };

    let diagram_code = if style == "chen" {
        generate_chen(schema, theme, randomize)
    } else {
        generate_crows_foot(schema)
    };

    format!("{}{}", init_directive, diagram_code)
}
